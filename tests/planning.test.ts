import { it, expect } from "vitest";
import {
  applyCommand,
  emptyLibrary,
} from "../src/features/library/domain/model";
import {
  backupSchema,
  commandSchema,
} from "../src/features/library/application/validation";
import { demoLibrary } from "../src/features/library/infrastructure/demo";
import {
  moveGame,
  playableGames,
} from "../src/features/library/domain/planning";
const now = "2026-09-30T12:00:00.000Z";
it("supports old backups and round-trips new lists, wishes and run reviews", () => {
  const s = demoLibrary();
  expect(
    backupSchema.parse({ version: 1, exportedAt: now, data: s }).data.games
      .length,
  ).toBe(s.games.length);
  s.games[0].wishlist = true;
  s.runs[0].rating = 8.5;
  s.runs[0].review = "Otra perspectiva";
  s.lists = [
    {
      id: "list",
      name: "Favoritos",
      description: "Mundos",
      gameIds: [s.games[0].id],
    },
  ];
  const imported = backupSchema.parse(
    JSON.parse(JSON.stringify({ version: 1, exportedAt: now, data: s })),
  );
  expect(imported.data).toEqual(s);
});
it("preserves manual order, removes deleted references and leaves games when deleting lists", () => {
  const s = demoLibrary(),
    ids = s.games.slice(0, 2).map((g) => g.id);
  const saved = applyCommand(
    s,
    {
      type: "save-list",
      list: {
        id: "list",
        name: "Viajes",
        description: "",
        gameIds: moveGame(ids, 1, -1),
      },
    },
    now,
  );
  expect(saved.lists![0].gameIds).toEqual([...ids].reverse());
  expect(
    applyCommand(saved, { type: "delete-game", id: ids[0] }, now).lists![0]
      .gameIds,
  ).toEqual([ids[1]]);
  expect(
    applyCommand(saved, { type: "delete-list", id: "list" }, now).games,
  ).toEqual(saved.games);
  expect(() =>
    applyCommand(
      s,
      {
        type: "save-list",
        list: { id: "bad", name: "Mal", description: "", gameIds: ["missing"] },
      },
      now,
    ),
  ).toThrow();
  expect(() =>
    applyCommand(
      s,
      {
        type: "save-list",
        list: {
          id: "bad",
          name: "Mal",
          description: "",
          gameIds: [ids[0], ids[0]],
        },
      },
      now,
    ),
  ).toThrow();
});
it("remaps imported list references when skipping duplicate games with different ids", () => {
  const s = demoLibrary(),
    g = s.games[0],
    r = s.runs.find((r) => r.id === g.primaryRunId)!;
  const incoming = emptyLibrary();
  incoming.games = [{ ...g, id: "other", primaryRunId: "other-run" }];
  incoming.runs = [{ ...r, id: "other-run", gameId: "other" }];
  incoming.lists = [
    { id: "new-list", name: "Importada", description: "", gameIds: ["other"] },
  ];
  const merged = applyCommand(
    s,
    { type: "import", policy: "skip", data: incoming },
    now,
  );
  expect(merged.games.length).toBe(s.games.length);
  expect(merged.lists![0].gameIds).toEqual([g.id]);
  expect(
    applyCommand(
      merged,
      { type: "import", policy: "replace", data: demoLibrary() },
      now,
    ).lists,
  ).toEqual([]);
});
it("keeps replay ratings independent and validates rating increments", () => {
  const s = demoLibrary(),
    r = s.runs[0],
    g = s.games.find((g) => g.id === r.gameId)!;
  const next = applyCommand(
    s,
    commandSchema.parse({
      type: "save-run",
      run: { ...r, rating: 6.5, review: "Rejugada" },
      primary: false,
    }),
    now,
  );
  expect(next.runs.find((x) => x.id === r.id)?.rating).toBe(6.5);
  expect(next.games.find((x) => x.id === g.id)?.rating).toBe(g.rating);
  expect(() =>
    commandSchema.parse({
      type: "save-run",
      run: { ...r, rating: 6.3 },
      primary: false,
    }),
  ).toThrow();
});
it("picker excludes wishlist and non-pending games and unknown durations under a duration limit", () => {
  const s = demoLibrary();
  s.runs = s.runs.map((r) => ({
    ...r,
    status: "pendiente",
    completedOn: undefined,
  }));
  s.games[0].wishlist = true;
  s.games[1].approximateHours = 5;
  delete s.games[2].approximateHours;
  expect(
    playableGames(s, "", "", undefined).some((g) => g.id === s.games[0].id),
  ).toBe(false);
  const pool = playableGames(s, "", "", 10);
  expect(pool.some((g) => g.id === s.games[1].id)).toBe(true);
  expect(pool.some((g) => g.id === s.games[2].id)).toBe(false);
  expect(playableGames(s, "No existe", "", undefined)).toEqual([]);
});
