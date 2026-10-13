import type { Game, Library } from "./model";
export function moveGame(ids: string[], index: number, offset: number) {
  const next = [...ids],
    target = index + offset;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length)
    return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
// Lleva un juego al principio de la lista.
export function moveToTop(ids: string[], index: number) {
  if (index <= 0 || index >= ids.length) return [...ids];
  return [ids[index], ...ids.slice(0, index), ...ids.slice(index + 1)];
}
// Posición de cada juego en tu orden de prioridad; los que no tienen
// posición van detrás, primero los marcados como próximos.
export function priorityRank(state: Library) {
  const place = new Map(
    (state.profile.priority ?? []).map((id, i) => [id, i] as const),
  );
  return (g: Game) => place.get(g.id) ?? (g.next ? 100000 : 200000);
}
// Los juegos que se pueden ordenar: los mismos que muestra Próximos.
export function priorityGames(state: Library) {
  const rank = priorityRank(state);
  return state.games
    .filter(
      (g) =>
        g.next ||
        state.runs.some(
          (r) => r.id === g.primaryRunId && r.status === "pendiente",
        ),
    )
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, "es"));
}
