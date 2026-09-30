import { it, expect } from "vitest";
import { applyCommand, activityId } from "../src/features/library/domain/model";
import {
  commandSchema,
  backupSchema,
} from "../src/features/library/application/validation";
import { demoLibrary } from "../src/features/library/infrastructure/demo";
import {
  changeRunStatus,
  estimatedHours,
  igdbTimes,
  listProgress,
  matchesGame,
} from "../src/features/library/domain/daily";
import { playableGames } from "../src/features/library/domain/planning";
const now = "2026-09-30T12:00:00.000Z";
it("bulk adds distinct days atomically without overwriting existing notes", () => {
  const s = demoLibrary(),
    g = s.games[0];
  s.activities = [
    {
      id: activityId(g.id, "2026-09-01"),
      gameId: g.id,
      date: "2026-09-01",
      note: "Original",
    },
  ];
  const next = applyCommand(
    s,
    commandSchema.parse({
      type: "add-activities",
      gameId: g.id,
      runId: g.primaryRunId,
      dates: ["2026-09-01", "2026-09-02", "2026-09-02"],
      note: "Nueva",
    }),
    now,
  );
  expect(next.activities).toHaveLength(2);
  expect(next.activities[0].note).toBe("Original");
  expect(next.activities[1].note).toBe("Nueva");
  expect(next.revision).toBe(s.revision + 1);
  expect(() =>
    applyCommand(
      s,
      {
        type: "add-activities",
        gameId: g.id,
        runId: "foreign",
        dates: ["2026-09-02"],
        note: "",
      },
      now,
    ),
  ).toThrow();
  expect(() =>
    commandSchema.parse({
      type: "add-activities",
      gameId: g.id,
      runId: g.primaryRunId,
      dates: ["2026-02-30"],
      note: "",
    }),
  ).toThrow();
  expect(s.activities).toHaveLength(1);
});
it("quick status preserves run notes and rating, removes stale completion date, and respects date validation", () => {
  const s = demoLibrary(),
    r = { ...s.runs[0], rating: 9, review: "Opinión", startedOn: "2026-01-01" };
  const completed = changeRunStatus(r, "completado", "2026-09-30");
  expect(completed.completedOn).toBe("2026-09-30");
  expect(completed.rating).toBe(9);
  expect(completed.whereLeft).toBe(r.whereLeft);
  expect(
    changeRunStatus(completed, "en pausa", "2026-09-30").completedOn,
  ).toBeUndefined();
  expect(() =>
    applyCommand(
      s,
      {
        type: "save-run",
        primary: true,
        run: changeRunStatus(
          { ...r, startedOn: "2027-01-01" },
          "completado",
          "2026-09-30",
        ),
      },
      now,
    ),
  ).toThrow();
});
it("search covers accents, activity and replay notes, but spoilers only with explicit opt-in", () => {
  const s = demoLibrary(),
    g = s.games[0];
  g.title = "Juego";
  g.review = "Una emoción";
  g.spoilerNote = "Secreto final";
  s.runs.filter((r) => r.gameId === g.id)[0].whereLeft = "Busca la llave azul";
  expect(matchesGame(s, g, "emocion")).toBe(true);
  expect(matchesGame(s, g, "llave azul")).toBe(true);
  expect(matchesGame(s, g, "secreto final")).toBe(false);
  expect(matchesGame(s, g, "secreto final", true)).toBe(true);
});
it("list progress counts each completed game once including previous replays", () => {
  const s = demoLibrary(),
    g = s.games[0],
    r = s.runs[0];
  s.runs.push({
    ...r,
    id: "replay",
    gameId: g.id,
    status: "completado",
    completedOn: "2026-09-30",
  });
  s.runs.push({
    ...r,
    id: "replay2",
    gameId: g.id,
    status: "completado",
    completedOn: "2026-09-30",
  });
  expect(listProgress(s, [g.id])).toEqual({
    completed: 1,
    total: 1,
    percent: 100,
  });
  expect(listProgress(s, []).percent).toBe(0);
});
it("converts IGDB seconds, treats missing and zero values as unknown, and retains per-category sources", () => {
  expect(igdbTimes({ hastily: 5400, normally: 9000, completely: 0 })).toEqual({
    main: { hours: 1.5, source: "IGDB" },
    extras: { hours: 2.5, source: "IGDB" },
  });
  expect(igdbTimes()).toEqual({});
  expect(igdbTimes({ hastily: -1, normally: Infinity })).toEqual({});
  const s = demoLibrary(),
    g = s.games[0];
  g.times = {
    main: { hours: 5, source: "manual" },
    extras: { hours: 15, source: "IGDB" },
  };
  g.approximateHours = 99;
  expect(estimatedHours(g)).toBe(5);
  expect(estimatedHours(g, "complete")).toBeUndefined();
  expect(
    backupSchema.parse({ version: 1, exportedAt: now, data: s }).data.games[0]
      .times,
  ).toEqual(g.times);
  s.runs.find((r) => r.id === g.primaryRunId)!.status = "pendiente";
  expect(playableGames(s, "", "", 10, "main").some((x) => x.id === g.id)).toBe(
    true,
  );
  expect(
    playableGames(s, "", "", 10, "extras").some((x) => x.id === g.id),
  ).toBe(false);
});
