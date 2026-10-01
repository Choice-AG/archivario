import { estimatedHours, type TimeMode } from "./daily";
import type { Library } from "./model";
export function playableGames(
  state: Library,
  platform: string,
  genre: string,
  maxHours: number | undefined,
  mode: TimeMode = "main",
  minCritic?: number,
) {
  return state.games.filter(
    (g) =>
      !g.wishlist &&
      state.runs.some(
        (r) => r.id === g.primaryRunId && r.status === "pendiente",
      ) &&
      (!platform || g.platforms.includes(platform)) &&
      (!genre || g.genres.includes(genre)) &&
      (maxHours === undefined ||
        (estimatedHours(g, mode) ?? Infinity) <= maxHours) &&
      (minCritic === undefined || (g.critic?.score ?? -1) >= minCritic),
  );
}
export function moveGame(ids: string[], index: number, offset: number) {
  const next = [...ids],
    target = index + offset;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length)
    return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
