import "server-only";
import { FieldPath, type WriteBatch } from "firebase-admin/firestore";
import { db } from "./firebase";
import { HttpError } from "./http";
import type { Library } from "@/features/library/domain/model";
import {
  handleError,
  normalizeHandle,
  publicGame,
  publicProfile,
  socialChanges,
  type FeedEvent,
  type PublicGame,
} from "@/features/social/domain";

// Capa pública, separada de la biblioteca privada:
// socialAccounts/{uid}       nombre de usuario y datos para mostrar a otros
// socialHandles/{handle}     reserva del nombre de usuario
// publicProfiles/{uid}       perfil y lista resumida de juegos
//   /games/{gameId}          detalle de un juego (reseñas)
//   /events/{id}             actividad para el feed
// follows/{a}_{b}            a sigue a b
// notifications/{uid}/items  avisos («X ha empezado a seguirte»)

type Account = {
  uid: string;
  handle: string;
  name: string;
  avatarColor?: string;
};

const accounts = () => db().collection("socialAccounts");
const handles = () => db().collection("socialHandles");
const profiles = () => db().collection("publicProfiles");
const follows = () => db().collection("follows");
const inbox = (uid: string) =>
  db().collection("notifications").doc(uid).collection("items");

const FEED_PER_PERSON = 8;
const MAX_FOLLOWING = 300;

export async function account(uid: string) {
  const snap = await accounts().doc(uid).get();
  return snap.exists ? ({ uid, ...snap.data() } as Account) : undefined;
}

async function uidFor(handle: string) {
  const snap = await handles().doc(normalizeHandle(handle)).get();
  return snap.exists ? (snap.data()!.uid as string) : undefined;
}

// Escribe en lotes de como mucho 450 operaciones.
async function inBatches(ops: ((b: WriteBatch) => void)[]) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db().batch();
    for (const op of ops.slice(i, i + 450)) op(batch);
    await batch.commit();
  }
}

function summary(s: Library) {
  return s.games
    .map((g) => publicGame(s, g))
    .filter((g): g is PublicGame => !!g)
    .map((g) => ({
      gameId: g.gameId,
      title: g.title,
      ...(g.cover ? { cover: g.cover } : {}),
      status: g.status,
      wishlist: g.wishlist,
      favorite: g.favorite,
      ...(g.rating !== undefined ? { rating: g.rating } : {}),
    }));
}

function profileDoc(handle: string, s: Library) {
  return {
    handle,
    ...publicProfile(s),
    library: summary(s),
    updatedAt: new Date().toISOString(),
  };
}

// Activa lo social o cambia el nombre de usuario, y publica la biblioteca.
export async function enable(uid: string, input: string, library: Library) {
  const handle = normalizeHandle(input);
  const problem = handleError(handle);
  if (problem) throw new HttpError(400, problem);
  const previous = await account(uid);
  await db().runTransaction(async (tx) => {
    const taken = await tx.get(handles().doc(handle));
    if (taken.exists && taken.data()!.uid !== uid)
      throw new HttpError(409, "Ese nombre de usuario ya está cogido.");
    if (previous && previous.handle !== handle)
      tx.delete(handles().doc(previous.handle));
    tx.set(handles().doc(handle), { uid });
    tx.set(
      accounts().doc(uid),
      {
        handle,
        name: library.profile.name,
        ...(library.profile.avatarColor
          ? { avatarColor: library.profile.avatarColor }
          : {}),
        ...(previous ? {} : { since: new Date().toISOString() }),
      },
      { merge: true },
    );
  });
  // La primera vez se publican todos los juegos visibles.
  const games = library.games
    .map((g) => publicGame(library, g))
    .filter((g): g is PublicGame => !!g);
  await inBatches([
    (b) => b.set(profiles().doc(uid), profileDoc(handle, library)),
    ...games.map(
      (g) => (b: WriteBatch) =>
        b.set(profiles().doc(uid).collection("games").doc(g.gameId), g),
    ),
  ]);
  return { enabled: true, handle };
}

// Desactivar borra todo lo público: perfil, actividad, seguidores y avisos.
export async function disable(uid: string) {
  const current = await account(uid);
  if (current) await handles().doc(current.handle).delete();
  await accounts().doc(uid).delete();
  await db().recursiveDelete(profiles().doc(uid));
  await db().recursiveDelete(db().collection("notifications").doc(uid));
  const links = await Promise.all([
    follows().where("follower", "==", uid).get(),
    follows().where("followed", "==", uid).get(),
  ]);
  await inBatches(
    links.flatMap((q) => q.docs.map((d) => (b: WriteBatch) => b.delete(d.ref))),
  );
}

// Tras cada cambio de la biblioteca: copia pública y entradas del feed.
export async function sync(uid: string, prev: Library, next: Library) {
  const me = await account(uid);
  if (!me) return;
  const changes = socialChanges(prev, next);
  const now = new Date().toISOString();
  const profile = profiles().doc(uid);
  const ops: ((b: WriteBatch) => void)[] = [
    (b) => b.set(profile, profileDoc(me.handle, next)),
  ];
  if (
    me.name !== next.profile.name ||
    me.avatarColor !== next.profile.avatarColor
  )
    ops.push((b) =>
      b.set(
        accounts().doc(uid),
        {
          name: next.profile.name,
          avatarColor: next.profile.avatarColor ?? null,
        },
        { merge: true },
      ),
    );
  for (const g of changes.games)
    ops.push((b) => b.set(profile.collection("games").doc(g.gameId), g));
  for (const id of changes.removedGames)
    ops.push((b) => b.delete(profile.collection("games").doc(id)));
  for (const { id, mode, event } of changes.events) {
    const ref = profile.collection("events").doc(id);
    ops.push((b) =>
      mode === "create"
        ? b.set(ref, { ...event, at: now })
        : b.set(ref, event, { merge: true }),
    );
  }
  for (const gameId of changes.removedEventGames) {
    const old = await profile
      .collection("events")
      .where("gameId", "==", gameId)
      .get();
    for (const d of old.docs) ops.push((b) => b.delete(d.ref));
  }
  await inBatches(ops);
}

function person(a: Account) {
  return {
    handle: a.handle,
    name: a.name || a.handle,
    ...(a.avatarColor ? { avatarColor: a.avatarColor } : {}),
  };
}

const followId = (follower: string, followed: string) =>
  follower + "_" + followed;

export async function profileByHandle(handle: string, viewer?: string) {
  const uid = await uidFor(handle);
  if (!uid) throw new HttpError(404, "No hay nadie con ese nombre de usuario.");
  const [profile, events, following] = await Promise.all([
    profiles().doc(uid).get(),
    profiles()
      .doc(uid)
      .collection("events")
      .orderBy("at", "desc")
      .limit(15)
      .get(),
    viewer && viewer !== uid
      ? follows().doc(followId(viewer, uid)).get()
      : Promise.resolve(undefined),
  ]);
  if (!profile.exists)
    throw new HttpError(404, "No hay nadie con ese nombre de usuario.");
  return {
    profile: profile.data(),
    events: events.docs.map((d) => ({ id: d.id, ...d.data() })),
    self: viewer === uid,
    following: !!following?.exists,
  };
}

export async function gameByHandle(handle: string, gameId: string) {
  const uid = await uidFor(handle);
  const snap = uid
    ? await profiles().doc(uid).collection("games").doc(gameId).get()
    : undefined;
  if (!snap?.exists) throw new HttpError(404, "Ese juego no está compartido.");
  return snap.data() as PublicGame;
}

export async function follow(uid: string, handle: string) {
  const me = await account(uid);
  if (!me)
    throw new HttpError(
      403,
      "Activa tu perfil público en ajustes para seguir a otras personas.",
    );
  const target = await uidFor(handle);
  if (!target)
    throw new HttpError(404, "No hay nadie con ese nombre de usuario.");
  if (target === uid) throw new HttpError(400, "No puedes seguirte a ti.");
  const ref = follows().doc(followId(uid, target));
  if ((await ref.get()).exists) return { following: true };
  const count = await follows().where("follower", "==", uid).count().get();
  if (count.data().count >= MAX_FOLLOWING)
    throw new HttpError(400, "Ya sigues al máximo de personas.");
  const at = new Date().toISOString();
  const batch = db().batch();
  batch.set(ref, { follower: uid, followed: target, at });
  batch.set(inbox(target).doc(), {
    type: "follow",
    from: uid,
    at,
    read: false,
  });
  await batch.commit();
  return { following: true };
}

export async function unfollow(uid: string, handle: string) {
  const target = await uidFor(handle);
  if (target) await follows().doc(followId(uid, target)).delete();
  return { following: false };
}

async function people(uids: string[]) {
  const unique = [...new Set(uids)];
  if (!unique.length) return new Map<string, Account>();
  const snaps = await db().getAll(...unique.map((u) => accounts().doc(u)));
  return new Map(
    snaps
      .filter((s) => s.exists)
      .map((s) => [s.id, { uid: s.id, ...s.data() } as Account]),
  );
}

export async function feed(uid: string) {
  const [links, notes] = await Promise.all([
    follows().where("follower", "==", uid).get(),
    inbox(uid).orderBy("at", "desc").limit(20).get(),
  ]);
  const followed = links.docs.map((d) => d.data().followed as string);
  const lists = await Promise.all(
    followed.map((f) =>
      profiles()
        .doc(f)
        .collection("events")
        .orderBy("at", "desc")
        .limit(FEED_PER_PERSON)
        .get()
        .then((q) =>
          q.docs.map((d) => ({
            id: f + "/" + d.id,
            uid: f,
            ...(d.data() as FeedEvent & { at: string }),
          })),
        ),
    ),
  );
  const events = lists
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 60);
  const who = await people([
    ...events.map((e) => e.uid),
    ...notes.docs.map((d) => d.data().from as string),
  ]);
  return {
    following: followed.length,
    events: events.flatMap(({ uid: author, ...e }) => {
      const a = who.get(author);
      return a ? [{ ...e, author: person(a) }] : [];
    }),
    notifications: notes.docs.flatMap((d) => {
      const n = d.data();
      const a = who.get(n.from);
      return a
        ? [
            {
              id: d.id,
              type: n.type,
              at: n.at,
              read: !!n.read,
              from: person(a),
            },
          ]
        : [];
    }),
  };
}

export async function unreadCount(uid: string) {
  const q = await inbox(uid).where("read", "==", false).count().get();
  return q.data().count;
}

export async function markRead(uid: string) {
  const unread = await inbox(uid).where("read", "==", false).get();
  await inBatches(
    unread.docs.map((d) => (b: WriteBatch) => b.update(d.ref, { read: true })),
  );
}

export async function network(uid: string) {
  const [out, inc] = await Promise.all([
    follows().where("follower", "==", uid).get(),
    follows().where("followed", "==", uid).get(),
  ]);
  const followingIds = out.docs.map((d) => d.data().followed as string);
  const followerIds = inc.docs.map((d) => d.data().follower as string);
  const who = await people([...followingIds, ...followerIds]);
  const list = (ids: string[]) =>
    ids.flatMap((id) => {
      const a = who.get(id);
      return a ? [person(a)] : [];
    });
  return {
    following: list(followingIds),
    followers: list(followerIds).map((p) => ({
      ...p,
      followedBack: followingIds.some((id) => who.get(id)?.handle === p.handle),
    })),
  };
}

export async function search(query: string) {
  const q = normalizeHandle(query);
  if (q.length < 2) return { people: [] };
  const found = await handles()
    .orderBy(FieldPath.documentId())
    .startAt(q)
    .endAt(q + "")
    .limit(10)
    .get();
  const who = await people(found.docs.map((d) => d.data().uid as string));
  return { people: [...who.values()].map(person) };
}
