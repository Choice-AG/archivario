import "server-only";
import { createHash } from "node:crypto";
import type {
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { db } from "@/server/firebase";
import { deletionRef } from "@/server/lifecycle";
import { emptyLibrary, type Library } from "../domain/model";
import { ConflictError, type LibraryRepository } from "../application/ports";

// Formato 2: la biblioteca se reparte en bloques de tamaño acotado para no
// chocar con el límite de 1 MiB por documento. Solo se reescriben los bloques
// que cambian. El documento del formato 1 se conserva intacto como copia.
const CHUNK_BYTES = 400_000;
const KEYS = ["games", "runs", "activities", "lists", "sagas"] as const;
type ChunkKey = (typeof KEYS)[number];
type Meta = {
  format: 2;
  revision: number;
  profile: Library["profile"];
  chunks: Record<ChunkKey, string[]>;
};

function userRef(uid: string) {
  if (!uid || uid.includes("/")) throw new Error("Identidad no válida");
  return db().collection("users").doc(uid);
}
export function stateRef(uid: string) {
  return userRef(uid).collection("private").doc("library");
}
function metaRef(uid: string) {
  return userRef(uid).collection("private").doc("library-v2");
}
function chunkRef(uid: string, key: ChunkKey, index: number) {
  return userRef(uid)
    .collection("libraryChunks")
    .doc(key + "-" + index);
}

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

export function chunk<T>(items: T[], maxBytes = CHUNK_BYTES): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [],
    size = 0;
  for (const item of items) {
    const bytes = Buffer.byteLength(JSON.stringify(item)) + 1;
    if (current.length && size + bytes > maxBytes) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += bytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function refsFor(uid: string, meta: Meta) {
  return KEYS.flatMap((key) =>
    meta.chunks[key].map((_, i) => ({ key, ref: chunkRef(uid, key, i) })),
  );
}
function assemble(
  meta: Meta,
  docs: { key: ChunkKey; snap: DocumentSnapshot }[],
) {
  const state: Library = {
    revision: meta.revision,
    profile: meta.profile,
    games: [],
    runs: [],
    activities: [],
    lists: [],
    sagas: [],
  };
  for (const { key, snap } of docs) {
    const items = snap.data()?.items;
    if (!Array.isArray(items))
      throw new Error("Falta un bloque de la biblioteca: " + snap.id);
    (state[key] as unknown[]).push(...items);
  }
  return state;
}

export class FirebaseLibraryRepository implements LibraryRepository {
  async read(uid: string) {
    const meta = (await metaRef(uid).get()).data() as Meta | undefined;
    if (!meta)
      return ((await stateRef(uid).get()).data() as Library) ?? emptyLibrary();
    const refs = refsFor(uid, meta);
    const snaps = refs.length
      ? await db().getAll(...refs.map((r) => r.ref))
      : [];
    return assemble(
      meta,
      refs.map((r, i) => ({ key: r.key, snap: snaps[i] })),
    );
  }
  async transact(
    uid: string,
    revision: number,
    update: (s: Library) => Library,
  ) {
    return db().runTransaction(async (tx) => {
      if ((await tx.get(deletionRef(uid))).exists)
        throw new ConflictError("La cuenta se está eliminando.");
      const { current, meta } = await readInTransaction(tx, uid);
      if (current.revision !== revision)
        throw new ConflictError(
          "Tu biblioteca cambió en otro dispositivo. Se ha actualizado; vuelve a guardar.",
        );
      const next = update(current);
      writeChunks(tx, uid, next, meta);
      return next;
    });
  }
}

async function readInTransaction(tx: Transaction, uid: string) {
  const metaSnap = await tx.get(metaRef(uid));
  const meta = metaSnap.data() as Meta | undefined;
  if (!meta) {
    // Migración perezosa: la primera escritura convierte el formato 1.
    const legacy = await tx.get(stateRef(uid));
    return {
      current: legacy.exists ? (legacy.data() as Library) : emptyLibrary(),
      meta: undefined,
    };
  }
  const refs = refsFor(uid, meta);
  const snaps = refs.length
    ? await tx.getAll(...(refs.map((r) => r.ref) as DocumentReference[]))
    : [];
  return {
    current: assemble(
      meta,
      refs.map((r, i) => ({ key: r.key, snap: snaps[i] })),
    ),
    meta,
  };
}

function writeChunks(
  tx: Transaction,
  uid: string,
  next: Library,
  previous: Meta | undefined,
) {
  const chunks = {} as Record<ChunkKey, string[]>;
  for (const key of KEYS) {
    const parts = chunk((next[key] ?? []) as unknown[]);
    const old = previous?.chunks[key] ?? [];
    chunks[key] = parts.map((items, i) => {
      const h = hash(items);
      if (old[i] !== h) tx.set(chunkRef(uid, key, i), { items });
      return h;
    });
    for (let i = parts.length; i < old.length; i++)
      tx.delete(chunkRef(uid, key, i));
  }
  const meta: Meta = {
    format: 2,
    revision: next.revision,
    profile: next.profile,
    chunks,
  };
  tx.set(metaRef(uid), meta);
}
