import type { Game, Library } from "./model";

// Resúmenes de un periodo («2026» o «2026-10») para los gráficos del tiempo
// jugado y las imágenes del año y del mes. Solo cuentan, no comparan.

const inPeriod = (date: string | undefined, prefix: string) =>
  !!date && date.startsWith(prefix);

export function periodSummary(state: Library, prefix: string) {
  const byId = new Map(state.games.map((g) => [g.id, g]));
  const activities = state.activities.filter(
    (a) => byId.has(a.gameId) && inPeriod(a.date, prefix),
  );
  const completedRuns = state.runs.filter(
    (r) =>
      byId.has(r.gameId) &&
      r.status === "completado" &&
      inPeriod(r.completedOn, prefix),
  );
  const days = new Map<string, Set<string>>(),
    minutes = new Map<string, number>();
  for (const a of activities) {
    days.set(a.gameId, (days.get(a.gameId) ?? new Set()).add(a.date));
    minutes.set(a.gameId, (minutes.get(a.gameId) ?? 0) + (a.minutes ?? 0));
  }
  const played = new Set([
    ...activities.map((a) => a.gameId),
    ...completedRuns.map((r) => r.gameId),
  ]);
  // Lo más jugado: primero por tiempo apuntado, después por días.
  const top = [...played]
    .map((id) => byId.get(id)!)
    .sort(
      (a, b) =>
        (minutes.get(b.id) ?? 0) - (minutes.get(a.id) ?? 0) ||
        (days.get(b.id)?.size ?? 0) - (days.get(a.id)?.size ?? 0) ||
        a.title.localeCompare(b.title, "es"),
    );
  const rated = top.filter((g) => g.rating !== undefined);
  const best = [...rated].sort(
    (a, b) => b.rating! - a.rating! || a.title.localeCompare(b.title, "es"),
  )[0];
  return {
    games: played.size,
    days: new Set(activities.map((a) => a.date)).size,
    completed: completedRuns.length,
    minutes: activities.reduce((s, a) => s + (a.minutes ?? 0), 0),
    top,
    best,
    completedGames: [...new Set(completedRuns.map((r) => r.gameId))].map((id) =>
      byId.get(id)!,
    ),
    daysOf: (g: Game) => days.get(g.id)?.size ?? 0,
    minutesOf: (g: Game) => minutes.get(g.id) ?? 0,
  };
}

// Minutos apuntados en cada mes de un año.
export function minutesByMonth(state: Library, year: string) {
  const ids = new Set(state.games.map((g) => g.id));
  const months = Array<number>(12).fill(0);
  for (const a of state.activities)
    if (ids.has(a.gameId) && a.date.startsWith(year + "-") && a.minutes)
      months[Number(a.date.slice(5, 7)) - 1] += a.minutes;
  return months;
}

// Los últimos doce meses hasta el de hoy, del más antiguo al más reciente.
export function lastMonths(state: Library, today: string, count = 12) {
  const ids = new Set(state.games.map((g) => g.id));
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    const month = d.toISOString().slice(0, 7);
    const minutes = state.activities
      .filter((a) => ids.has(a.gameId) && a.date.startsWith(month))
      .reduce((s, a) => s + (a.minutes ?? 0), 0);
    return { month, minutes };
  });
}

// Reparto del tiempo por plataforma (la de la partida) o por género.
export function minutesBy(
  state: Library,
  prefix: string,
  by: "platform" | "genre",
  max = 5,
) {
  const games = new Map(state.games.map((g) => [g.id, g]));
  const runs = new Map(state.runs.map((r) => [r.id, r]));
  const totals = new Map<string, number>();
  for (const a of state.activities) {
    const g = games.get(a.gameId);
    if (!g || !a.minutes || !a.date.startsWith(prefix)) continue;
    const keys =
      by === "genre"
        ? g.genres
        : [
            (a.runId && runs.get(a.runId)?.platform) ||
              runs.get(g.primaryRunId)?.platform ||
              g.platforms[0],
          ];
    for (const key of new Set(keys))
      totals.set(key, (totals.get(key) ?? 0) + a.minutes);
  }
  return [...totals]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "es"))
    .slice(0, max);
}
