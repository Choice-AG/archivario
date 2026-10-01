import type { Game, Library, Run } from "../library/domain/model";

// Lo social es una copia pública aparte de la biblioteca privada. Este módulo
// decide qué se copia y qué cambios aparecen en el feed; nunca incluye las
// notas con spoilers ni los juegos ocultos.

export const HANDLE_PATTERN = /^[a-z0-9_.]{3,20}$/;
export function normalizeHandle(input: string) {
  return input.trim().replace(/^@/, "").toLowerCase();
}
export function handleError(handle: string) {
  if (!HANDLE_PATTERN.test(handle))
    return "Usa entre 3 y 20 letras sin tildes, números, puntos o guiones bajos.";
  if (/^[._]|[._]$/.test(handle) || /[._]{2}/.test(handle))
    return "No empieces ni acabes con punto o guion bajo, ni los repitas.";
  return "";
}

export type PublicGame = {
  gameId: string;
  title: string;
  cover?: string;
  catalogId?: number;
  status: Run["status"];
  wishlist: boolean;
  favorite: boolean;
  rating?: number;
  platform: string;
  startedOn: string;
  completedOn?: string;
  review: string;
  runReviews: { label: string; rating?: number; review: string }[];
  updatedAt: string;
};

export type FeedEvent = {
  type: "completed" | "started" | "rated" | "reviewed";
  gameId: string;
  title: string;
  cover?: string;
  rating?: number;
  platform?: string;
  days?: number;
  hours?: number;
  blurb?: string;
  hasReview?: boolean;
};

export type PublicProfile = {
  name: string;
  bio: string;
  avatarColor?: string;
  stats: { games: number; completed: number; playing: number };
  playing: { gameId: string; title: string; cover?: string }[];
  favorites: { gameId: string; title: string; cover?: string }[];
};

const visible = (g: Game) => !g.hidden;
const primary = (s: Library, g: Game) =>
  s.runs.find((r) => r.id === g.primaryRunId);
const optional = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function publicGame(s: Library, g: Game): PublicGame | undefined {
  const run = primary(s, g);
  if (!run || !visible(g)) return undefined;
  return optional({
    gameId: g.id,
    title: g.title,
    cover: g.cover,
    catalogId: g.catalogId,
    status: run.status,
    wishlist: !!g.wishlist,
    favorite: g.favorite,
    rating: run.rating ?? g.rating,
    platform: run.platform,
    startedOn: run.startedOn,
    completedOn: run.completedOn,
    review: g.review.trim(),
    // Las reseñas de cada partida, pero nunca la nota con spoilers.
    runReviews: s.runs
      .filter((r) => r.gameId === g.id && r.review?.trim())
      .map((r) =>
        optional({
          label: r.label,
          rating: r.rating,
          review: r.review!.trim(),
        }),
      ),
    updatedAt: g.updatedAt,
  });
}

export function publicProfile(s: Library): PublicProfile {
  const shared = s.games.filter(visible);
  const status = (g: Game) => primary(s, g)?.status;
  const card = (g: Game) =>
    optional({ gameId: g.id, title: g.title, cover: g.cover });
  const showcase = (s.profile.showcase ?? [])
    .map((id) => shared.find((g) => g.id === id))
    .filter((g): g is Game => !!g);
  return optional({
    name: s.profile.name,
    bio: s.profile.bio,
    avatarColor: s.profile.avatarColor,
    stats: {
      games: shared.filter((g) => !g.wishlist).length,
      completed: shared.filter((g) => status(g) === "completado").length,
      playing: shared.filter((g) => status(g) === "jugando").length,
    },
    playing: shared
      .filter((g) => status(g) === "jugando")
      .slice(0, 8)
      .map(card),
    favorites: (showcase.length ? showcase : shared.filter((g) => g.favorite))
      .slice(0, 5)
      .map(card),
  });
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export type SocialChanges = {
  games: PublicGame[];
  removedGames: string[];
  // `create` lleva fecha y sube el evento en el feed; `update` solo corrige
  // los datos de uno que ya existe (la nota o la frase tras completar).
  events: { id: string; mode: "create" | "update"; event: FeedEvent }[];
  removedEventGames: string[];
};

function journey(s: Library, g: Game, run: Run): Partial<FeedEvent> {
  const days = new Set(
    s.activities.filter((a) => a.gameId === g.id).map((a) => a.date),
  ).size;
  const hours =
    run.completionMinutes !== undefined
      ? Math.round(run.completionMinutes / 6) / 10
      : (g.times?.main?.hours ?? g.approximateHours);
  return optional({
    days: days || undefined,
    hours,
    platform: run.platform,
  });
}

// Qué cambió entre dos versiones de la biblioteca, en términos públicos.
export function socialChanges(prev: Library, next: Library): SocialChanges {
  const out: SocialChanges = {
    games: [],
    removedGames: [],
    events: [],
    removedEventGames: [],
  };
  for (const old of prev.games) {
    const now = next.games.find((g) => g.id === old.id);
    if ((!now || !visible(now)) && visible(old)) {
      out.removedGames.push(old.id);
      out.removedEventGames.push(old.id);
    }
  }
  for (const g of next.games) {
    const shared = publicGame(next, g);
    if (!shared) continue;
    const before = prev.games.find((x) => x.id === g.id);
    const oldShared = before ? publicGame(prev, before) : undefined;
    if (!same(shared, oldShared)) out.games.push(shared);
    if (g.wishlist) continue;
    const base = { gameId: g.id, title: g.title, cover: g.cover };
    let completedNow = false;
    for (const run of next.runs.filter((r) => r.gameId === g.id)) {
      const was = prev.runs.find((r) => r.id === run.id);
      if (run.status === "completado") {
        const event: FeedEvent = optional({
          ...base,
          type: "completed" as const,
          rating: run.rating ?? g.rating,
          blurb: run.shareNote?.trim() || undefined,
          hasReview: !!(g.review.trim() || run.review?.trim()),
          ...journey(next, g, run),
        });
        if (was?.status !== "completado") {
          out.events.push({ id: "c_" + run.id, mode: "create", event });
          completedNow = true;
        } else if (!same(event, oldCompleted(prev, run.id))) {
          out.events.push({ id: "c_" + run.id, mode: "update", event });
        }
      } else if (
        run.status === "jugando" &&
        was?.status !== "jugando" &&
        run.id === g.primaryRunId
      ) {
        out.events.push({
          id: "s_" + run.id,
          mode: "create",
          event: optional({
            ...base,
            type: "started" as const,
            platform: run.platform,
          }),
        });
      }
    }
    const done = next.runs.some(
      (r) => r.gameId === g.id && r.status === "completado",
    );
    // Valorar un juego ya completado corrige su tarjeta en lugar de añadir
    // otra línea al feed.
    if (
      !completedNow &&
      !done &&
      g.rating !== undefined &&
      before?.rating !== g.rating
    )
      out.events.push({
        id: "r_" + g.id,
        mode: "create",
        event: optional({ ...base, type: "rated" as const, rating: g.rating }),
      });
    if (g.review.trim() && !before?.review.trim())
      out.events.push({
        id: "v_" + g.id,
        mode: "create",
        event: optional({
          ...base,
          type: "reviewed" as const,
          rating: g.rating,
        }),
      });
  }
  return out;
}

function oldCompleted(prev: Library, runId: string) {
  const run = prev.runs.find((r) => r.id === runId);
  const g = run && prev.games.find((x) => x.id === run.gameId);
  if (!run || !g || run.status !== "completado") return undefined;
  return optional({
    gameId: g.id,
    title: g.title,
    cover: g.cover,
    type: "completed" as const,
    rating: run.rating ?? g.rating,
    blurb: run.shareNote?.trim() || undefined,
    hasReview: !!(g.review.trim() || run.review?.trim()),
    ...journey(prev, g, run),
  });
}
