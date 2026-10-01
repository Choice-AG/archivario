import type { Library, Saga, SagaEntry } from "./model";
export function sagaGames(state: Library, e: SagaEntry) {
  return state.games.filter(
    (g) =>
      (e.catalogId ? g.catalogId === e.catalogId : g.id === e.gameId) ||
      (e.alternatives ?? []).some((a) => a.catalogId === g.catalogId),
  );
}
export function sagaGame(state: Library, e: SagaEntry) {
  const games = sagaGames(state, e);
  return (
    games.find((g) =>
      state.runs.some((r) => r.gameId === g.id && r.status === "completado"),
    ) ?? games[0]
  );
}
export function sagaCompleted(state: Library, e: SagaEntry) {
  const game = sagaGame(state, e);
  return (
    !!game &&
    state.runs.some((r) => r.gameId === game.id && r.status === "completado")
  );
}
// Estado que se muestra: «completada» cuando están todos los juegos no
// opcionales; si no, el que hayas elegido (por defecto, siguiéndola).
export function sagaStatus(state: Library, saga: Saga) {
  const required = saga.entries.filter((e) => !e.optional);
  return required.length && required.every((e) => sagaCompleted(state, e))
    ? "completada"
    : (saga.status ?? "siguiendo");
}
export const sagaStatusLabels = {
  siguiendo: "Siguiéndola",
  "en pausa": "En pausa",
  abandonada: "Abandonada",
  completada: "Completada",
} as const;
export function sagaOrder(saga: Saga) {
  return saga.order === "release"
    ? [...saga.entries].sort(
        (a, b) =>
          (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999") ||
          a.title.localeCompare(b.title, "es"),
      )
    : saga.entries;
}
