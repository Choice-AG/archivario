import { expect, it } from "vitest";
import {
  heatLevel,
  heatmap,
  latestReviews,
  onboardingSteps,
  profileStats,
  showcaseGames,
} from "../src/features/library/domain/profile";
import { profileSchema } from "../src/features/library/application/validation";
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
const run = (gameId: string, extra: Partial<Run> = {}): Run => ({
  id: gameId,
  gameId,
  label: "Primera partida",
  platform: "PC",
  status: "pendiente",
  completion: "sin especificar",
  startedOn: "2026-02-01",
  whereLeft: "",
  ...extra,
});

it("summarises the whole library for the profile", () => {
  const state = emptyLibrary();
  state.games = [
    game("a", { genres: ["RPG"], platforms: ["PC"], rating: 8 }),
    game("b", {
      genres: ["RPG", "Acción"],
      platforms: ["PC", "Switch"],
      rating: 6,
      critic: { score: 90, count: 10 },
      review: "Genial",
    }),
    game("c", { wishlist: true, genres: ["Puzle"] }),
  ];
  state.runs = [
    run("a", { status: "jugando", startedOn: "2025-12-20" }),
    run("b", {
      status: "completado",
      completedOn: "2026-03-01",
      completionMinutes: 150,
    }),
    run("c"),
  ];
  state.activities = [
    { id: "a_2026-01-02", gameId: "a", date: "2026-01-02", note: "" },
    { id: "b_2026-01-02", gameId: "b", date: "2026-01-02", note: "" },
    { id: "x_2026-01-03", gameId: "borrado", date: "2026-01-03", note: "" },
  ];
  const s = profileStats(state);
  expect(s).toMatchObject({
    games: 2,
    wishlist: 1,
    completed: 1,
    playing: 1,
    days: 1,
    hours: 3,
    reviews: 1,
    since: "2025-12-20",
    myAverage: 6,
    criticAverage: 9,
    compared: 1,
  });
  expect(s.genres[0]).toEqual({ name: "RPG", count: 2 });
  expect(s.platforms.map((p) => p.name)).toEqual(["PC", "Switch"]);
  expect(s.lastCompleted?.game.id).toBe("b");
});

it("uses the chosen showcase and falls back to the best favourites", () => {
  const state = emptyLibrary();
  state.games = [
    game("a", { favorite: true, rating: 7 }),
    game("b", { favorite: true, rating: 9 }),
    game("c"),
  ];
  expect(showcaseGames(state)).toEqual({
    games: [state.games[1], state.games[0]],
    chosen: false,
  });
  state.profile.showcase = ["c", "eliminado", "a"];
  expect(showcaseGames(state).games.map((g) => g.id)).toEqual(["c", "a"]);
});

it("lists the most recently updated reviews", () => {
  const state = emptyLibrary();
  state.games = [
    game("old", { review: "x", updatedAt: "2026-01-01" }),
    game("new", { review: "y", updatedAt: "2026-05-01" }),
    game("none", { updatedAt: "2026-09-01" }),
  ];
  expect(latestReviews(state).map((g) => g.id)).toEqual(["new", "old"]);
});

it("builds a Monday-first heatmap for the whole year", () => {
  const state = emptyLibrary();
  state.games = [game("a"), game("b")];
  state.activities = [
    { id: "a_2026-01-01", gameId: "a", date: "2026-01-01", note: "" },
    { id: "b_2026-01-01", gameId: "b", date: "2026-01-01", note: "" },
    { id: "a_2026-12-31", gameId: "a", date: "2026-12-31", note: "" },
    { id: "a_2025-12-31", gameId: "a", date: "2025-12-31", note: "" },
  ];
  const map = heatmap(state, "2026");
  // El 1 de enero de 2026 es jueves: lunes a miércoles quedan vacíos.
  expect(map.weeks[0].slice(0, 3)).toEqual([null, null, null]);
  expect(map.weeks[0][3]).toEqual({ date: "2026-01-01", count: 2 });
  const days = map.weeks.flat().filter(Boolean);
  expect(days).toHaveLength(365);
  expect(days.at(-1)).toEqual({ date: "2026-12-31", count: 1 });
  expect(map).toMatchObject({ days: 2, max: 2 });
  expect([0, 1, 2].map((n) => heatLevel(n, 2))).toEqual([0, 2, 4]);
  expect(heatLevel(1, 1)).toBe(4);
});

it("tracks the first steps of a new account", () => {
  const state = emptyLibrary();
  expect(onboardingSteps(state).every((s) => !s.done)).toBe(true);
  state.games = [game("a", { rating: 8 })];
  state.runs = [run("a", { status: "jugando" })];
  expect(onboardingSteps(state).map((s) => s.done)).toEqual([
    true,
    true,
    false,
    true,
  ]);
});

it("validates the new profile fields", () => {
  const base = { name: "", bio: "", timezone: "UTC" };
  expect(
    profileSchema.safeParse({
      ...base,
      avatarColor: "verde",
      showcase: ["a", "b"],
      onboardingDone: true,
    }).success,
  ).toBe(true);
  expect(
    profileSchema.safeParse({ ...base, avatarColor: "fucsia" }).success,
  ).toBe(false);
  expect(
    profileSchema.safeParse({
      ...base,
      showcase: ["a", "b", "c", "d", "e", "f"],
    }).success,
  ).toBe(false);
});
