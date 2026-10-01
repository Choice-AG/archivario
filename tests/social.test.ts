import { expect, it } from "vitest";
import {
  handleError,
  normalizeHandle,
  publicGame,
  publicProfile,
  socialChanges,
} from "../src/features/social/domain";
import {
  emptyLibrary,
  type Game,
  type Library,
  type Run,
} from "../src/features/library/domain/model";

const game = (id: string, extra: Partial<Game> = {}): Game => ({
  id,
  title: id.toUpperCase(),
  genres: [],
  platforms: ["PC"],
  stores: [],
  favorite: false,
  next: false,
  review: "",
  spoilerNote: "Muere al final",
  primaryRunId: id,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});
const run = (gameId: string, extra: Partial<Run> = {}): Run => ({
  id: gameId,
  gameId,
  label: "Primera partida",
  platform: "PC",
  status: "pendiente",
  completion: "sin especificar",
  startedOn: "2026-01-01",
  whereLeft: "Mi nota privada",
  ...extra,
});
function lib(games: Game[], runs: Run[]): Library {
  return { ...emptyLibrary(), games, runs };
}

it("validates and normalises handles", () => {
  expect(normalizeHandle("  @Ana.Plays ")).toBe("ana.plays");
  expect(handleError("ana.plays")).toBe("");
  expect(handleError("an")).not.toBe("");
  expect(handleError("añana")).not.toBe("");
  expect(handleError(".ana")).not.toBe("");
  expect(handleError("ana..b")).not.toBe("");
});

it("never shares spoilers, private notes or hidden games", () => {
  const s = lib(
    [game("a", { review: "Precioso" }), game("b", { hidden: true })],
    [run("a", { review: "Mejor la segunda vez" }), run("b")],
  );
  const shared = publicGame(s, s.games[0])!;
  expect(JSON.stringify(shared)).not.toContain("Muere al final");
  expect(JSON.stringify(shared)).not.toContain("Mi nota privada");
  expect(shared).toMatchObject({
    review: "Precioso",
    runReviews: [{ review: "Mejor la segunda vez" }],
  });
  expect(publicGame(s, s.games[1])).toBeUndefined();
  expect(publicProfile(s).stats.games).toBe(1);
});

it("creates a completion card with the trip and updates it afterwards", () => {
  const before = lib([game("a")], [run("a", { status: "jugando" })]);
  before.activities = [
    { id: "a_2026-01-02", gameId: "a", date: "2026-01-02", note: "" },
    { id: "a_2026-01-03", gameId: "a", date: "2026-01-03", note: "" },
  ];
  const done = structuredClone(before);
  done.runs[0] = {
    ...done.runs[0],
    status: "completado",
    completedOn: "2026-01-04",
    completionMinutes: 1620,
  };
  const c = socialChanges(before, done);
  expect(c.events).toEqual([
    {
      id: "c_a",
      mode: "create",
      event: {
        gameId: "a",
        title: "A",
        type: "completed",
        hasReview: false,
        days: 2,
        hours: 27,
        platform: "PC",
      },
    },
  ]);
  // Valorar y escribir la frase en la celebración corrige la misma tarjeta.
  const rated = structuredClone(done);
  rated.games[0].rating = 9.5;
  rated.runs[0].shareNote = "La música es increíble";
  const u = socialChanges(done, rated);
  expect(u.events).toEqual([
    expect.objectContaining({
      id: "c_a",
      mode: "update",
      event: expect.objectContaining({
        rating: 9.5,
        blurb: "La música es increíble",
      }),
    }),
  ]);
});

it("logs starting, rating and reviewing, and removes hidden or deleted games", () => {
  const before = lib([game("a"), game("b")], [run("a"), run("b")]);
  const after = structuredClone(before);
  after.runs[0].status = "jugando";
  after.games[1] = { ...after.games[1], rating: 8, review: "Muy bueno" };
  const c = socialChanges(before, after);
  expect(c.events.map((e) => e.id).sort()).toEqual(["r_b", "s_a", "v_b"]);
  expect(c.games.map((g) => g.gameId).sort()).toEqual(["a", "b"]);
  const hidden = structuredClone(after);
  hidden.games[0].hidden = true;
  hidden.games.splice(1, 1);
  const h = socialChanges(after, hidden);
  expect(h.removedGames.sort()).toEqual(["a", "b"]);
  expect(h.events).toEqual([]);
  // Sin cambios públicos no hay nada que escribir.
  expect(socialChanges(after, structuredClone(after))).toEqual({
    games: [],
    removedGames: [],
    events: [],
    removedEventGames: [],
  });
});
