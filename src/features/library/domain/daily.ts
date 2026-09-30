import type { Game, GameTimes, Library, Run, Status } from "./model";
export type TimeMode = "main" | "extras" | "complete";
export const timeLabels = {
  main: "Historia principal",
  extras: "Historia + extras",
  complete: "Completar al 100 %",
};
export function estimatedHours(game: Game, mode: TimeMode = "main") {
  return (
    game.times?.[mode]?.hours ??
    (mode === "main" ? game.approximateHours : undefined)
  );
}
export function formatHours(hours: number | undefined) {
  return hours === undefined
    ? "Sin datos"
    : hours.toLocaleString("es", { maximumFractionDigits: 1 }) + " h";
}
export function igdbTimes(row?: {
  hastily?: number;
  normally?: number;
  completely?: number;
}): GameTimes {
  const out: GameTimes = {};
  for (const [key, seconds] of [
    ["main", row?.hastily],
    ["extras", row?.normally],
    ["complete", row?.completely],
  ] as const)
    if (
      seconds !== undefined &&
      Number.isFinite(seconds) &&
      seconds > 0 &&
      seconds <= 36000000
    )
      out[key] = { hours: Math.round(seconds / 360) / 10, source: "IGDB" };
  return out;
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
export function matchesGame(
  state: Library,
  game: Game,
  query: string,
  spoilers = false,
) {
  const texts = [
    game.title,
    game.review,
    ...state.runs
      .filter((r) => r.gameId === game.id)
      .flatMap((r) => [r.review ?? "", r.whereLeft]),
    ...state.activities.filter((a) => a.gameId === game.id).map((a) => a.note),
    ...(spoilers ? [game.spoilerNote] : []),
  ];
  return texts.some((text) =>
    normalize(text).includes(normalize(query.trim())),
  );
}
export function changeRunStatus(run: Run, status: Status, today: string): Run {
  const { completedOn: old, ...base } = run;
  return {
    ...base,
    status,
    ...(status === "completado" ? { completedOn: old ?? today } : {}),
  };
}
export function listProgress(state: Library, ids: string[]) {
  const completed = ids.filter((id) =>
    state.runs.some((r) => r.gameId === id && r.status === "completado"),
  ).length;
  return {
    completed,
    total: ids.length,
    percent: ids.length ? Math.round((completed / ids.length) * 100) : 0,
  };
}
