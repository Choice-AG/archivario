import "server-only";
import { createHash } from "node:crypto";
import type { DocumentData } from "firebase-admin/firestore";
import { db } from "./firebase";
import { deletionRef } from "./lifecycle";
import { HttpError } from "./http";
import { igdbTimes } from "@/features/library/domain/daily";
export type CatalogGame = {
  catalogId: number;
  title: string;
  cover?: string;
  genres: string[];
  platforms: string[];
  critic?: { score: number; count: number };
};
// Nota media de la crítica profesional según IGDB (0-100), si existe.
function critic(score?: number, count?: number) {
  return score !== undefined &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 100 &&
    count
    ? { critic: { score: Math.round(score), count: Math.round(count) } }
    : {};
}
const DAY = 86400000;
// Solo cuentan las consultas que llegan a IGDB (fallos de caché).
const USER_LIMIT = 20;
const GLOBAL_LIMIT = 150;

let token: { value: string; expires: number } | undefined;
let pendingToken: Promise<string> | undefined;
async function fetchToken() {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.IGDB_CLIENT_ID!,
      client_secret: process.env.IGDB_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data = res.ok ? await res.json().catch(() => null) : null;
  if (
    typeof data?.access_token !== "string" ||
    !Number.isFinite(data?.expires_in)
  )
    throw new HttpError(502, "No se ha podido conectar con el catálogo.");
  token = {
    value: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return token.value;
}
function accessToken() {
  if (token && token.expires > Date.now() + 60000)
    return Promise.resolve(token.value);
  // Las peticiones simultáneas comparten una sola renovación.
  pendingToken ??= fetchToken().finally(() => (pendingToken = undefined));
  return pendingToken;
}

function assertConfigured() {
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET)
    throw new HttpError(
      503,
      "IGDB aún no está configurado. Puedes añadir el juego manualmente.",
    );
}
function assertId(id: number, message = "Juego no válido.") {
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, message);
}

async function igdb<T>(
  endpoint: string,
  body: string,
  error: string,
): Promise<T[]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.igdb.com/v4/" + endpoint, {
      method: "POST",
      headers: {
        "Client-ID": process.env.IGDB_CLIENT_ID!,
        Authorization: "Bearer " + (await accessToken()),
        "Content-Type": "text/plain",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 && attempt === 0) {
      // Token revocado antes de caducar: se descarta y se reintenta una vez.
      token = undefined;
      continue;
    }
    if (!res.ok) throw new HttpError(502, error);
    const rows = await res.json().catch(() => null);
    if (!Array.isArray(rows)) throw new HttpError(502, error);
    return rows as T[];
  }
}

function image(size: "t_cover_big" | "t_1080p", imageId?: string) {
  return imageId && /^[a-z0-9]{1,64}$/.test(imageId)
    ? "https://images.igdb.com/igdb/image/upload/" +
        size +
        "/" +
        imageId +
        ".jpg"
    : undefined;
}
const cover = (imageId?: string) => {
  const url = image("t_cover_big", imageId);
  return url ? { cover: url } : {};
};
const releaseDate = (seconds?: number) =>
  seconds ? new Date(seconds * 1000).toISOString().slice(0, 10) : "";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

async function checkCatalogLimit(uid: string) {
  const now = Date.now(),
    limits = db().collection("catalogLimits"),
    ref = limits.doc(uid),
    globalRef = limits.doc("_global");
  await db().runTransaction(async (tx) => {
    const [lock, user, global] = await tx.getAll(
      deletionRef(uid),
      ref,
      globalRef,
    );
    if (lock.exists) throw new HttpError(409, "La cuenta se está eliminando.");
    const bucket = (data?: DocumentData) => {
      const start = data?.start ?? 0;
      const count = now - start < 60000 ? (data?.count ?? 0) : 0;
      return { start: count === 0 ? now : start, count };
    };
    const u = bucket(user.data()),
      g = bucket(global.data());
    if (u.count >= USER_LIMIT)
      throw new HttpError(429, "Espera un minuto antes de buscar de nuevo.");
    if (g.count >= GLOBAL_LIMIT)
      throw new HttpError(
        429,
        "El catálogo está muy solicitado. Inténtalo en un minuto.",
      );
    tx.set(ref, { start: u.start, count: u.count + 1 });
    tx.set(globalRef, { start: g.start, count: g.count + 1 });
  });
}

// Consulta la caché compartida y solo aplica el límite cuando hay que ir a IGDB.
async function cached<T>(
  uid: string,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const ref = db().collection("catalogCache").doc(key),
    hit = (await ref.get()).data();
  if (hit && hit.expires > Date.now()) return hit.value as T;
  await checkCatalogLimit(uid);
  const value = await load();
  await ref.set({ value, expires: Date.now() + DAY });
  if (Math.random() < CLEANUP_RATE) await cleanupCache();
  return value;
}

// La TTL de Firestore exige facturación (Blaze). En Spark se borran de vez en
// cuando unos pocos documentos caducados, con un coste acotado.
const CLEANUP_RATE = 0.05;
export async function cleanupCache(limit = 20) {
  try {
    const expired = await db()
      .collection("catalogCache")
      .where("expires", "<", Date.now())
      .limit(limit)
      .get();
    if (expired.empty) return 0;
    const batch = db().batch();
    for (const doc of expired.docs) batch.delete(doc.ref);
    await batch.commit();
    return expired.size;
  } catch (e) {
    // La limpieza es opcional: nunca debe romper una consulta del catálogo.
    console.error(
      "Limpieza de caché",
      e instanceof Error ? e.message : "Error",
    );
    return 0;
  }
}

export async function searchCatalog(
  uid: string,
  q: string,
  page: number,
): Promise<CatalogGame[]> {
  assertConfigured();
  return cached(
    uid,
    hash("games-v4:" + q.toLowerCase() + ":" + page),
    async () => {
      const rows = await igdb<{
        id: number;
        name: string;
        cover?: { image_id: string };
        genres?: { name: string }[];
        platforms?: { name: string }[];
        aggregated_rating?: number;
        aggregated_rating_count?: number;
      }>(
        "games",
        `search "${q.replace(/["\\]/g, " ")}"; fields name,cover.image_id,genres.name,platforms.name,aggregated_rating,aggregated_rating_count; where game_type != 5; limit 20; offset ${(page - 1) * 20};`,
        "El catálogo no está disponible temporalmente.",
      );
      return rows.map((g) => ({
        catalogId: g.id,
        title: g.name,
        genres: g.genres?.map((x) => x.name) ?? [],
        platforms: g.platforms?.map((x) => x.name) ?? [],
        ...cover(g.cover?.image_id),
        ...critic(g.aggregated_rating, g.aggregated_rating_count),
      }));
    },
  );
}

export async function catalogDetails(uid: string, id: number) {
  assertId(id);
  assertConfigured();
  return cached(uid, "details-v5-" + id, async () => {
    const [g] = await igdb<{
      name: string;
      screenshots?: { image_id: string }[];
      cover?: { image_id: string };
      genres?: { name: string }[];
      platforms?: { name: string }[];
      summary?: string;
      first_release_date?: number;
      involved_companies?: {
        developer?: boolean;
        company?: { name: string };
      }[];
      videos?: { name: string; video_id: string }[];
      aggregated_rating?: number;
      aggregated_rating_count?: number;
    }>(
      "games",
      `fields name,aggregated_rating,aggregated_rating_count,cover.image_id,screenshots.image_id,genres.name,platforms.name,summary,first_release_date,involved_companies.company.name,involved_companies.developer,videos.name,videos.video_id; where id = ${id}; limit 1;`,
      "No se ha podido cargar la ficha de IGDB.",
    );
    if (!g) throw new HttpError(404, "Ficha no encontrada.");
    return {
      screenshots: (g.screenshots ?? [])
        .map((x) => image("t_1080p", x.image_id))
        .filter((x): x is string => !!x)
        .slice(0, 8),
      catalogId: id,
      title: g.name,
      cover: image("t_cover_big", g.cover?.image_id) ?? null,
      genres: g.genres?.map((x) => x.name) ?? [],
      platforms: g.platforms?.map((x) => x.name) ?? [],
      summary: g.summary ?? "",
      ...critic(g.aggregated_rating, g.aggregated_rating_count),
      releaseDate: releaseDate(g.first_release_date),
      developers: [
        ...new Set(
          (g.involved_companies ?? [])
            .filter((c) => c.developer && c.company?.name)
            .map((c) => c.company!.name),
        ),
      ],
      videos: (g.videos ?? [])
        .filter((v) => /^[a-zA-Z0-9_-]{11}$/.test(v.video_id))
        .slice(0, 4)
        .map((v) => ({
          name: v.name,
          url: "https://www.youtube.com/watch?v=" + v.video_id,
        })),
    };
  });
}

export async function catalogTimes(uid: string, id: number) {
  assertId(id);
  assertConfigured();
  return cached(uid, "times-v2-" + id, async () => {
    const rows = await igdb<{
      hastily?: number;
      normally?: number;
      completely?: number;
    }>(
      "game_time_to_beats",
      `fields hastily,normally,completely; where game_id = ${id}; limit 1;`,
      "No se han podido consultar los tiempos de IGDB.",
    );
    return igdbTimes(rows[0]);
  });
}

export async function catalogSeries(uid: string, id: number) {
  assertId(id);
  assertConfigured();
  return cached(uid, "series-v2-" + id, async () => {
    const error = "No se ha podido consultar la saga.";
    const [game] = await igdb<{
      first_release_date?: number;
      collections?: { id: number; name: string }[];
    }>(
      "games",
      `fields first_release_date,collections.name; where id = ${id}; limit 1;`,
      error,
    );
    if (!game) throw new HttpError(404, "Juego no encontrado.");
    const collections = (game.collections ?? [])
      .filter((c) => Number.isSafeInteger(c.id) && c.id > 0)
      .slice(0, 10);
    const rows = collections.length
      ? await igdb<{
          id: number;
          name: string;
          slug?: string;
          cover?: { image_id: string };
          first_release_date?: number;
        }>(
          "games",
          `fields name,slug,cover.image_id,first_release_date; where collections = (${collections.map((c) => c.id).join(",")}) & id != ${id} & game_type = (0,8,9,10) & version_parent = null; sort first_release_date asc; limit 100;`,
          error,
        )
      : [];
    return {
      names: collections.map((c) => c.name),
      limited: rows.length === 100,
      items: rows.map((g) => ({
        id: g.id,
        title: g.name,
        releaseDate: releaseDate(g.first_release_date),
        relation:
          !g.first_release_date || !game.first_release_date
            ? "unknown"
            : g.first_release_date < game.first_release_date
              ? "earlier"
              : g.first_release_date > game.first_release_date
                ? "later"
                : "same",
        ...cover(g.cover?.image_id),
        ...(g.slug && /^[a-z0-9-]+$/.test(g.slug)
          ? { url: "https://www.igdb.com/games/" + g.slug }
          : {}),
      })),
    };
  });
}

export async function sagaCatalog(uid: string, query: string, id?: number) {
  if (id !== undefined) assertId(id, "Saga no válida.");
  if (
    id === undefined &&
    (query.length < 2 || query.length > 80 || /[;{}\n\r]/.test(query))
  )
    throw new HttpError(400, "Escribe entre 2 y 80 caracteres.");
  assertConfigured();
  const error = "No se han podido cargar las sagas.";
  const key = hash(
    "sagas-v3:" +
      (id === undefined ? "search:" + query.toLowerCase() : "id:" + id),
  );
  return cached(uid, key, async () => {
    if (id === undefined)
      return {
        items: await igdb<{ id: number; name: string }>(
          "collections",
          `search "${query.replace(/["\\]/g, " ")}"; fields name; limit 20;`,
          error,
        ),
      };
    const [collection] = await igdb<{ name: string }>(
      "collections",
      `fields name; where id = ${id}; limit 1;`,
      error,
    );
    if (!collection) throw new HttpError(404, "Saga no encontrada.");
    const rows = await igdb<{
      id: number;
      name: string;
      cover?: { image_id: string };
      first_release_date?: number;
    }>(
      "games",
      `fields name,cover.image_id,first_release_date; where collections = (${id}) & game_type = (0,8,9,10) & version_parent = null; sort first_release_date asc; limit 100;`,
      error,
    );
    return {
      id: "igdb-" + id,
      name: collection.name,
      description: "Recorre los juegos de esta saga y sigue tu progreso.",
      source: "IGDB · orden de lanzamiento",
      order: "release",
      entries: rows.map((g) => ({
        catalogId: g.id,
        title: g.name,
        ...cover(g.cover?.image_id),
        releaseDate: releaseDate(g.first_release_date),
        chapter: "",
        note: "",
        optional: false,
      })),
    };
  });
}
