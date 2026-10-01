import { estimatedHours, type TimeMode } from "./daily";
import type { Game, Library } from "./model";
export type GameSort = "recent" | "title" | "rating" | "shortest";
export function sortGames(
  games: Game[],
  state: Library,
  sort: GameSort,
  mode: TimeMode = "main",
) {
  const last = new Map<string, string>();
  for (const a of state.activities)
    if (a.date > (last.get(a.gameId) ?? "")) last.set(a.gameId, a.date);
  return [...games].sort((a, b) => {
    const title = () => a.title.localeCompare(b.title, "es");
    if (sort === "title") return title();
    if (sort === "rating")
      return (b.rating ?? -1) - (a.rating ?? -1) || title();
    if (sort === "shortest")
      return (
        (estimatedHours(a, mode) ?? Infinity) -
          (estimatedHours(b, mode) ?? Infinity) || title()
      );
    return (
      (last.get(b.id) ?? "").localeCompare(last.get(a.id) ?? "") ||
      b.updatedAt.localeCompare(a.updatedAt) ||
      title()
    );
  });
}
export function annualSummary(state: Library, year: string) {
  const activities = state.activities.filter((a) =>
    a.date.startsWith(year + "-"),
  );
  const completed = state.runs.filter(
    (r) => r.status === "completado" && r.completedOn?.startsWith(year + "-"),
  );
  const played = new Set([
    ...activities.map((a) => a.gameId),
    ...completed.map((r) => r.gameId),
  ]);
  const rated = state.games.filter(
    (g) => played.has(g.id) && g.rating !== undefined,
  );
  const months = Array.from({ length: 12 }, (_, i) => {
    const prefix = year + "-" + String(i + 1).padStart(2, "0");
    return new Set(
      activities.filter((a) => a.date.startsWith(prefix)).map((a) => a.date),
    ).size;
  });
  // Reparto por plataforma y género de los juegos jugados en el año.
  const tally = (pick: (g: (typeof state.games)[number]) => string[]) => {
    const counts = new Map<string, number>();
    for (const g of state.games)
      if (played.has(g.id))
        for (const key of new Set(pick(g)))
          counts.set(key, (counts.get(key) ?? 0) + 1);
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"))
      .slice(0, 5);
  };
  const sorted = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  const busiest = months.reduce(
    (best, days, i) => (days > (months[best] ?? 0) ? i : best),
    0,
  );
  return {
    platforms: tally((g) => g.platforms),
    genres: tally((g) => g.genres),
    busiestMonth: months[busiest] ? busiest : undefined,
    first: sorted[0],
    last: sorted[sorted.length - 1],
    games: played.size,
    days: new Set(activities.map((a) => a.date)).size,
    completed: completed.length,
    months,
    average: rated.length
      ? rated.reduce((sum, g) => sum + g.rating!, 0) / rated.length
      : undefined,
    best: [...rated]
      .sort(
        (a, b) => b.rating! - a.rating! || a.title.localeCompare(b.title, "es"),
      )
      .slice(0, 5),
  };
}
