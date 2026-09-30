import type { Library, Saga, SagaEntry } from "./model";
export function sagaGames(state: Library, e: SagaEntry) {
  return state.games.filter(
    (g) =>
      (e.catalogId ? g.catalogId === e.catalogId : g.id === e.gameId) ||
      (e.alternatives ?? []).some((a) => a.catalogId === g.catalogId),
  );
}
export function sagaGame(state: Library, e: SagaEntry) {
  return (
    sagaGames(state, e).find((g) =>
      state.runs.some((r) => r.gameId === g.id && r.status === "completado"),
    ) ?? sagaGames(state, e)[0]
  );
}
export function sagaCompleted(state: Library, e: SagaEntry) {
  const game = sagaGame(state, e);
  return (
    !!game &&
    state.runs.some((r) => r.gameId === game.id && r.status === "completado")
  );
}
export function sagaOrder(saga: Saga) {
  return saga.order === "release"
    ? [...saga.entries].sort(
        (a, b) =>
          (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999") ||
          a.title.localeCompare(b.title),
      )
    : saga.entries;
}
