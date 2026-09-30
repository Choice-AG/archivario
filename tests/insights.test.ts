import { expect, it } from "vitest";
import {
  annualSummary,
  sortGames,
} from "../src/features/library/domain/insights";
import { formatHours } from "../src/features/library/domain/daily";
import {
  emptyLibrary,
  type Game,
  type Run,
} from "../src/features/library/domain/model";
const game = (id: string, extra: Partial<Game> = {}): Game => ({
  id,
  title: id,
  genres: [],
  platforms: [],
  stores: [],
  favorite: false,
  next: false,
  review: "",
  spoilerNote: "",
  primaryRunId: id,
  updatedAt: "2026-01-01",
  ...extra,
});
it("sorts rated and known-duration games before missing values without mutating the library", () => {
  const state = emptyLibrary();
  state.games = [
    game("missing"),
    game("zero", { rating: 0, approximateHours: 0 }),
    game("high", { rating: 9, approximateHours: 8 }),
  ];
  expect(sortGames(state.games, state, "rating").map((g) => g.id)).toEqual([
    "high",
    "zero",
    "missing",
  ]);
  expect(sortGames(state.games, state, "shortest").map((g) => g.id)).toEqual([
    "zero",
    "high",
    "missing",
  ]);
  expect(state.games[0].id).toBe("missing");
});
it("counts distinct active days and games, includes completed replays, excludes other years and unrated games from the average", () => {
  const state = emptyLibrary();
  state.games = [
    game("a", { rating: 8 }),
    game("b"),
    game("c", { rating: 10 }),
  ];
  state.activities = [
    { id: "1", gameId: "a", date: "2026-01-01", note: "" },
    { id: "2", gameId: "b", date: "2026-01-01", note: "" },
    { id: "3", gameId: "c", date: "2025-01-01", note: "" },
  ];
  state.runs = [1, 2].map((i): Run => ({
    id: String(i),
    gameId: "a",
    label: "Partida " + i,
    platform: "PC",
    status: "completado",
    completion: "historia",
    startedOn: "2026-01-01",
    completedOn: "2026-02-01",
    whereLeft: "",
  }));
  const summary = annualSummary(state, "2026");
  expect(summary).toMatchObject({
    games: 2,
    days: 1,
    completed: 2,
    average: 8,
  });
  expect(summary.months).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  expect(summary.best.map((g) => g.id)).toEqual(["a"]);
  expect(annualSummary(emptyLibrary(), "2026").average).toBeUndefined();
});
it("orders by most recent activity, then by last update, then by title", () => {
  const state = emptyLibrary();
  state.games = [
    game("b", { updatedAt: "2026-03-01" }),
    game("a", { updatedAt: "2026-03-01" }),
    game("old", { updatedAt: "2026-01-01" }),
    game("played"),
  ];
  state.activities = [
    { id: "x", gameId: "played", date: "2026-05-01", note: "" },
    { id: "y", gameId: "played", date: "2026-04-01", note: "" },
  ];
  expect(sortGames(state.games, state, "recent").map((g) => g.id)).toEqual([
    "played",
    "a",
    "b",
    "old",
  ]);
});
it("formats hours in Spanish and reports missing data", () => {
  expect(formatHours(undefined)).toBe("Sin datos");
  expect(formatHours(12.5)).toBe("12,5 h");
});
