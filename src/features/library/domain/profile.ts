import type { Game, Library } from "./model";

export const avatarColors = [
  "violeta",
  "rosa",
  "ambar",
  "verde",
  "azul",
  "gris",
] as const;
export type AvatarColor = (typeof avatarColors)[number];
export const SHOWCASE_MAX = 5;

const tally = (games: Game[], pick: (g: Game) => string[]) => {
  const counts = new Map<string, number>();
  for (const g of games)
    for (const key of new Set(pick(g)))
      counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"))
    .slice(0, 3);
};

const average = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : undefined;

// Resumen de toda la biblioteca para la página de perfil.
export function profileStats(state: Library) {
  const owned = state.games.filter((g) => !g.wishlist);
  const ids = new Set(state.games.map((g) => g.id));
  const runs = state.runs.filter((r) => ids.has(r.gameId));
  const completedGames = new Set(
    runs.filter((r) => r.status === "completado").map((r) => r.gameId),
  );
  const playing = new Set(
    runs.filter((r) => r.status === "jugando").map((r) => r.gameId),
  );
  const activities = state.activities.filter((a) => ids.has(a.gameId));
  const minutes = runs.reduce((s, r) => s + (r.completionMinutes ?? 0), 0);
  // Tu nota (1-10) frente a la de la crítica (0-100) en los mismos juegos.
  const both = state.games.filter(
    (g) => g.rating !== undefined && g.critic !== undefined,
  );
  const firstDates = [
    ...activities.map((a) => a.date),
    ...runs.map((r) => r.startedOn).filter(Boolean),
  ].sort();
  const lastCompleted = runs
    .filter((r) => r.status === "completado" && r.completedOn)
    .sort((a, b) => b.completedOn!.localeCompare(a.completedOn!))[0];
  return {
    games: owned.length,
    wishlist: state.games.length - owned.length,
    completed: completedGames.size,
    playing: playing.size,
    days: new Set(activities.map((a) => a.date)).size,
    hours: Math.round(minutes / 60),
    reviews: state.games.filter((g) => g.review.trim()).length,
    since: firstDates[0],
    myAverage: average(both.map((g) => g.rating!)),
    criticAverage: average(both.map((g) => g.critic!.score / 10)),
    compared: both.length,
    genres: tally(owned, (g) => g.genres),
    platforms: tally(owned, (g) => g.platforms),
    lastCompleted: lastCompleted
      ? {
          game: state.games.find((g) => g.id === lastCompleted.gameId)!,
          date: lastCompleted.completedOn!,
        }
      : undefined,
  };
}

// Los juegos destacados que siguen en la biblioteca; si no has elegido
// ninguno, se usan tus favoritos mejor valorados.
export function showcaseGames(state: Library) {
  const byId = new Map(state.games.map((g) => [g.id, g]));
  const chosen = (state.profile.showcase ?? []).flatMap((id) => {
    const g = byId.get(id);
    return g ? [g] : [];
  });
  if (state.profile.showcase?.length) return { games: chosen, chosen: true };
  return {
    games: state.games
      .filter((g) => g.favorite)
      .sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) ||
          a.title.localeCompare(b.title, "es"),
      )
      .slice(0, SHOWCASE_MAX),
    chosen: false,
  };
}

export function latestReviews(state: Library, limit = 3) {
  return state.games
    .filter((g) => g.review.trim())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Mapa de calor de un año: semanas de lunes a domingo con los juegos de
// cada día. Los días fuera del año quedan como null para alinear la cuadrícula.
export function heatmap(state: Library, year: string) {
  const ids = new Set(state.games.map((g) => g.id));
  const perDay = new Map<string, number>();
  for (const a of state.activities)
    if (a.date.startsWith(year + "-") && ids.has(a.gameId))
      perDay.set(a.date, (perDay.get(a.date) ?? 0) + 1);
  const start = new Date(year + "-01-01T00:00:00Z");
  const offset = (start.getUTCDay() + 6) % 7;
  const cursor = new Date(start);
  cursor.setUTCDate(cursor.getUTCDate() - offset);
  const weeks: ({ date: string; count: number } | null)[][] = [];
  while (cursor.getUTCFullYear() <= Number(year)) {
    const week: ({ date: string; count: number } | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const date = iso(cursor);
      week.push(
        date.startsWith(year + "-")
          ? { date, count: perDay.get(date) ?? 0 }
          : null,
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    if (cursor.getUTCFullYear() > Number(year)) break;
  }
  return {
    weeks,
    days: perDay.size,
    max: Math.max(0, ...perDay.values()),
  };
}

// Nivel de color (0-4) de un día del mapa de calor.
export const heatLevel = (count: number, max: number) =>
  count === 0 ? 0 : max <= 1 ? 4 : Math.min(4, Math.ceil((count / max) * 4));

// Primeros pasos para cuentas nuevas, en el orden en que se suelen hacer.
export function onboardingSteps(state: Library) {
  return [
    {
      id: "game",
      label: "Añade tu primer juego",
      done: state.games.length > 0,
    },
    {
      id: "playing",
      label: "Marca un juego como «Jugando»",
      done: state.runs.some((r) => r.status === "jugando"),
    },
    {
      id: "day",
      label: "Registra un día de juego",
      done: state.activities.length > 0,
    },
    {
      id: "rate",
      label: "Valora o escribe la reseña de un juego",
      done: state.games.some((g) => g.rating !== undefined || g.review.trim()),
    },
  ] as const;
}
