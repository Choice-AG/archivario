import "server-only";
import { db } from "./firebase";
import { deletionRef } from "./lifecycle";
import { HttpError } from "./http";
export type CatalogGame = {
  catalogId: number;
  title: string;
  cover?: string;
  genres: string[];
  platforms: string[];
};
let token: { value: string; expires: number } | undefined;
async function accessToken() {
  if (token && token.expires > Date.now() + 60000) return token.value;
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
  if (!res.ok)
    throw new HttpError(502, "No se ha podido conectar con el catálogo.");
  const data = await res.json();
  token = {
    value: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return token.value;
}
export async function searchCatalog(
  uid: string,
  q: string,
  page: number,
): Promise<CatalogGame[]> {
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET)
    throw new HttpError(
      503,
      "IGDB aún no está configurado. Puedes añadir el juego manualmente.",
    );
  await checkCatalogLimit(uid);
  const now = Date.now();
  const { createHash } = await import("node:crypto");
  const key = createHash("sha256")
    .update("games-v2:" + q.toLowerCase() + ":" + page)
    .digest("hex");
  const cached = db().collection("catalogCache").doc(key),
    hit = (await cached.get()).data();
  if (hit && hit.expires > now) return hit.items;
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      Authorization: "Bearer " + (await accessToken()),
      "Content-Type": "text/plain",
    },
    body: `search "${q.replace(/["\\]/g, " ")}"; fields name,cover.image_id,genres.name,platforms.name; where game_type != 5; limit 20; offset ${(page - 1) * 20};`,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw new HttpError(502, "El catálogo no está disponible temporalmente.");
  const rows = (await res.json()) as {
    id: number;
    name: string;
    cover?: { image_id: string };
    genres?: { name: string }[];
    platforms?: { name: string }[];
  }[];
  const items = rows.map((g) => ({
    catalogId: g.id,
    title: g.name,
    genres: g.genres?.map((x) => x.name) ?? [],
    platforms: g.platforms?.map((x) => x.name) ?? [],
    ...(g.cover?.image_id
      ? {
          cover:
            "https://images.igdb.com/igdb/image/upload/t_cover_big/" +
            g.cover.image_id +
            ".jpg",
        }
      : {}),
  }));
  await cached.set({ items, expires: now + 86400000 });
  return items;
}

async function checkCatalogLimit(uid: string) {
  const now = Date.now(),
    ref = db().collection("catalogLimits").doc(uid);
  await db().runTransaction(async (tx) => {
    if ((await tx.get(deletionRef(uid))).exists)
      throw new HttpError(409, "La cuenta se está eliminando.");
    const s = (await tx.get(ref)).data();
    const start = s?.start ?? 0;
    const count = now - start < 60000 ? (s?.count ?? 0) : 0;
    if (count >= 20)
      throw new HttpError(429, "Espera un minuto antes de buscar de nuevo.");
    tx.set(ref, { start: count === 0 ? now : start, count: count + 1 });
  });
}

export async function catalogDetails(uid: string, id: number) {
  if (!Number.isSafeInteger(id) || id < 1)
    throw new HttpError(400, "Juego no válido.");
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET)
    throw new HttpError(503, "IGDB aún no está configurado.");
  await checkCatalogLimit(uid);
  const ref = db()
      .collection("catalogCache")
      .doc("details-v3-" + id),
    hit = (await ref.get()).data();
  if (hit && hit.expires > Date.now()) return hit.details;
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      Authorization: "Bearer " + (await accessToken()),
      "Content-Type": "text/plain",
    },
    body: `fields name,cover.image_id,screenshots.image_id,genres.name,platforms.name,summary,first_release_date,involved_companies.company.name,involved_companies.developer,videos.name,videos.video_id; where id = ${id}; limit 1;`,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw new HttpError(502, "No se ha podido cargar la ficha de IGDB.");
  const [g] = (await res.json()) as {
    name: string;
    screenshots?: { image_id: string }[];
    cover?: { image_id: string };
    genres?: { name: string }[];
    platforms?: { name: string }[];
    summary?: string;
    first_release_date?: number;
    involved_companies?: { developer?: boolean; company?: { name: string } }[];
    videos?: { name: string; video_id: string }[];
  }[];
  if (!g) throw new HttpError(404, "Ficha no encontrada.");
  const details = {
    screenshots: (g.screenshots ?? [])
      .slice(0, 8)
      .map(
        (x) =>
          "https://images.igdb.com/igdb/image/upload/t_1080p/" +
          x.image_id +
          ".jpg",
      ),
    catalogId: id,
    title: g.name,
    cover: g.cover?.image_id
      ? "https://images.igdb.com/igdb/image/upload/t_cover_big/" +
        g.cover.image_id +
        ".jpg"
      : null,
    genres: g.genres?.map((x) => x.name) ?? [],
    platforms: g.platforms?.map((x) => x.name) ?? [],
    summary: g.summary ?? "",
    releaseDate: g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
      : "",
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
  await ref.set({ details, expires: Date.now() + 86400000 });
  return details;
}
export async function catalogTimes(uid: string, id: number) {
  if (!Number.isSafeInteger(id) || id < 1)
    throw new HttpError(400, "Juego no válido.");
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET)
    throw new HttpError(503, "IGDB aún no está configurado.");
  await checkCatalogLimit(uid);
  const ref = db()
      .collection("catalogCache")
      .doc("times-v1-" + id),
    hit = (await ref.get()).data();
  if (hit && hit.expires > Date.now()) return hit.times;
  const res = await fetch("https://api.igdb.com/v4/game_time_to_beats", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      Authorization: "Bearer " + (await accessToken()),
      "Content-Type": "text/plain",
    },
    body: `fields hastily,normally,completely; where game_id = ${id}; limit 1;`,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw new HttpError(502, "No se han podido consultar los tiempos de IGDB.");
  const { igdbTimes } = await import("@/features/library/domain/daily");
  const rows = await res.json();
  const times = igdbTimes(rows[0]);
  await ref.set({ times, expires: Date.now() + 86400000 });
  return times;
}
export async function catalogSeries(uid: string, id: number) {
  if (!Number.isSafeInteger(id) || id < 1)
    throw new HttpError(400, "Juego no válido.");
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET)
    throw new HttpError(503, "IGDB aún no está configurado.");
  await checkCatalogLimit(uid);
  const ref = db()
      .collection("catalogCache")
      .doc("series-v1-" + id),
    hit = (await ref.get()).data();
  if (hit && hit.expires > Date.now()) return hit.series;
  async function query(body: string) {
    const r = await fetch("https://api.igdb.com/v4/games", {
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
    if (!r.ok) throw new HttpError(502, "No se ha podido consultar la saga.");
    return r.json();
  }
  const [game] = (await query(
    `fields first_release_date,collections.name; where id = ${id}; limit 1;`,
  )) as {
    first_release_date?: number;
    collections?: { id: number; name: string }[];
  }[];
  if (!game) throw new HttpError(404, "Juego no encontrado.");
  const collections = (game.collections ?? [])
    .filter((c) => Number.isSafeInteger(c.id) && c.id > 0)
    .slice(0, 10);
  const rows = collections.length
    ? ((await query(
        `fields name,slug,cover.image_id,first_release_date; where collections = (${collections.map((c) => c.id).join(",")}) & id != ${id} & game_type = (0,8,9,10) & version_parent = null; sort first_release_date asc; limit 100;`,
      )) as {
        id: number;
        name: string;
        slug?: string;
        cover?: { image_id: string };
        first_release_date?: number;
      }[])
    : [];
  const series = {
    names: collections.map((c) => c.name),
    limited: rows.length === 100,
    items: rows.map((g) => ({
      id: g.id,
      title: g.name,
      releaseDate: g.first_release_date
        ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
        : "",
      relation:
        !g.first_release_date || !game.first_release_date
          ? "unknown"
          : g.first_release_date < game.first_release_date
            ? "earlier"
            : g.first_release_date > game.first_release_date
              ? "later"
              : "same",
      ...(g.cover?.image_id
        ? {
            cover:
              "https://images.igdb.com/igdb/image/upload/t_cover_big/" +
              g.cover.image_id +
              ".jpg",
          }
        : {}),
      ...(g.slug && /^[a-z0-9-]+$/.test(g.slug)
        ? { url: "https://www.igdb.com/games/" + g.slug }
        : {}),
    })),
  };
  await ref.set({ series, expires: Date.now() + 86400000 });
  return series;
}
export async function sagaCatalog(uid: string, query: string, id?: number) {
  if (id !== undefined && (!Number.isSafeInteger(id) || id < 1))
    throw new HttpError(400, "Saga no válida.");
  if (
    id === undefined &&
    (query.length < 2 || query.length > 80 || /[;{}\n\r]/.test(query))
  )
    throw new HttpError(400, "Escribe entre 2 y 80 caracteres.");
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET)
    throw new HttpError(503, "IGDB no está configurado.");
  await checkCatalogLimit(uid);
  const { createHash } = await import("node:crypto");
  const key = createHash("sha256")
    .update(
      "sagas-v2:" +
        (id === undefined ? "search:" + query.toLowerCase() : "id:" + id),
    )
    .digest("hex");
  const ref = db().collection("catalogCache").doc(key),
    hit = (await ref.get()).data();
  if (hit && hit.expires > Date.now()) return hit.data;
  async function call(endpoint: string, body: string) {
    const r = await fetch("https://api.igdb.com/v4/" + endpoint, {
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
    if (!r.ok) throw new HttpError(502, "No se han podido cargar las sagas.");
    return r.json();
  }
  let data;
  if (id === undefined)
    data = {
      items: await call(
        "collections",
        `search "${query.replace(/["\\]/g, " ")}"; fields name; limit 20;`,
      ),
    };
  else {
    const [collection] = await call(
      "collections",
      `fields name; where id = ${id}; limit 1;`,
    );
    if (!collection) throw new HttpError(404, "Saga no encontrada.");
    const rows = (await call(
      "games",
      `fields name,cover.image_id,first_release_date; where collections = (${id}) & game_type = (0,8,9,10) & version_parent = null; sort first_release_date asc; limit 100;`,
    )) as {
      id: number;
      name: string;
      cover?: { image_id: string };
      first_release_date?: number;
    }[];
    data = {
      id: "igdb-" + id,
      name: collection.name,
      description: "Recorre los juegos de esta saga y sigue tu progreso.",
      source: "IGDB · orden de lanzamiento",
      order: "release",
      entries: rows.map((g) => ({
        catalogId: g.id,
        title: g.name,
        ...(g.cover
          ? {
              cover:
                "https://images.igdb.com/igdb/image/upload/t_cover_big/" +
                g.cover.image_id +
                ".jpg",
            }
          : {}),
        releaseDate: g.first_release_date
          ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
          : "",
        chapter: "",
        note: "",
        optional: false,
      })),
    };
  }
  await ref.set({ data, expires: Date.now() + 86400000 });
  return data;
}
