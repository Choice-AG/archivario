import { expect, it } from "vitest";
import {
  applyCommand,
  assertLibrary,
  emptyLibrary,
  type Game,
  type Library,
  type Run,
} from "../src/features/library/domain/model";
import { gameSchema } from "../src/features/library/application/validation";
import { allTags, recommenders } from "../src/features/library/domain/organize";
import { matchesGame } from "../src/features/library/domain/daily";
import {
  importPlan,
  libraryFromCandidates,
  libraryToCsv,
  readCsv,
} from "../src/features/library/domain/import-sources";

const now = "2026-10-13T18:00:00.000Z";
const today = "2026-10-13";
const game = (id: string, extra: Partial<Game> = {}): Game => ({
  id,
  title: id.toUpperCase(),
  genres: [],
  platforms: ["PC"],
  stores: [],
  favorite: false,
  next: false,
  review: "",
  spoilerNote: "",
  primaryRunId: id + "-run",
  updatedAt: now,
  ...extra,
});
const run = (gameId: string): Run => ({
  id: gameId + "-run",
  gameId,
  label: "Primera partida",
  platform: "PC",
  status: "pendiente",
  completion: "sin especificar",
  startedOn: "2026-01-01",
  whereLeft: "",
});
function lib(games: Game[]): Library {
  return { ...emptyLibrary(), games, runs: games.map((g) => run(g.id)) };
}

it("tags several games at once without repeating and removes tags", () => {
  const s = lib([game("a", { tags: ["En pareja"] }), game("b")]);
  const tagged = applyCommand(
    s,
    { type: "batch-tag", gameIds: ["a", "b"], tag: " en pareja " },
    now,
  );
  // Mayúsculas y espacios no crean una etiqueta nueva.
  expect(tagged.games.map((g) => g.tags)).toEqual([
    ["en pareja"],
    ["en pareja"],
  ]);
  const untagged = applyCommand(
    tagged,
    { type: "batch-tag", gameIds: ["a"], tag: "EN PAREJA", remove: true },
    now,
  );
  expect(untagged.games[0]).not.toHaveProperty("tags");
  const full = lib([
    game("a", { tags: Array.from({ length: 12 }, (_, i) => "t" + i) }),
  ]);
  expect(() =>
    applyCommand(full, { type: "batch-tag", gameIds: ["a"], tag: "otra" }, now),
  ).toThrow("12 etiquetas");
});

it("renames and deletes a tag everywhere, merging duplicates", () => {
  const s = lib([
    game("a", { tags: ["Relax", "Corto"] }),
    game("b", { tags: ["relax", "Relajante"] }),
    game("c"),
  ]);
  const renamed = applyCommand(
    s,
    { type: "rename-tag", from: "relax", to: "Relajante" },
    now,
  );
  expect(renamed.games.map((g) => g.tags)).toEqual([
    ["Corto", "Relajante"],
    ["Relajante"],
    undefined,
  ]);
  const removed = applyCommand(
    renamed,
    { type: "rename-tag", from: "relajante" },
    now,
  );
  expect(removed.games.map((g) => g.tags)).toEqual([
    ["Corto"],
    undefined,
    undefined,
  ]);
  expect(() =>
    assertLibrary(lib([game("a", { tags: ["Uno", "uno"] })])),
  ).toThrow("repetidas");
});

it("lists tags and recommenders and searches them", () => {
  const s = lib([
    game("a", { tags: ["Relax", "Corto"], recommendedBy: "Ana" }),
    game("b", { tags: ["relax"], recommendedBy: "ana", edition: "GOTY" }),
  ]);
  expect(allTags(s)).toEqual([
    { name: "Relax", count: 2 },
    { name: "Corto", count: 1 },
  ]);
  expect(recommenders(s)).toEqual(["Ana"]);
  expect(matchesGame(s, s.games[1], "relax")).toBe(true);
  expect(matchesGame(s, s.games[1], "ana")).toBe(true);
  expect(matchesGame(s, s.games[1], "goty")).toBe(true);
  expect(
    gameSchema.safeParse({
      ...game("c"),
      format: "físico",
      edition: "Steelbook",
    }).success,
  ).toBe(true);
  expect(
    gameSchema.safeParse({ ...game("c"), format: "cartucho" }).success,
  ).toBe(false);
});

it("reads a HowLongToBeat export", () => {
  const csv =
    '"Title","Platform","Playing","Backlog","Replay","Stalled","Blocked","","Completed","Retired","Completed","Progress","Main Story","Storefront","Review","Review Notes"\n' +
    '"Hades","PC","","","","","","","✓","","2026-03-02","22:30:00","20:00:00","Steam","90","Una joya"\n' +
    '"Celeste","Nintendo Switch","✓","","","","","","","","","03:10:00","--","","",""\n' +
    '"Anthem","PC","","","","","","","","✓","","","--","","",""\n' +
    '"Hollow Knight","PC","","✓","","","","","","","","","--","","",""\n';
  const { source, candidates } = readCsv(csv);
  expect(source).toBe("howlongtobeat");
  expect(candidates).toEqual([
    {
      title: "Hades",
      platforms: ["PC"],
      stores: ["Steam"],
      status: "completado",
      rating: 9,
      minutes: 1350,
      completedOn: "2026-03-02",
      review: "Una joya",
    },
    {
      title: "Celeste",
      platforms: ["Nintendo Switch"],
      stores: [],
      status: "jugando",
      minutes: 190,
    },
    { title: "Anthem", platforms: ["PC"], stores: [], status: "abandonado" },
    {
      title: "Hollow Knight",
      platforms: ["PC"],
      stores: [],
      status: "pendiente",
    },
  ]);
});

it("reads a Grouvee export, turning custom shelves into tags", () => {
  const q = (o: unknown) => '"' + JSON.stringify(o).replace(/"/g, '""') + '"';
  const csv =
    "id,name,shelves,platforms,rating,review,dates,statuses,genres,release_date,url,giantbomb_id\n" +
    [
      "1",
      "Outer Wilds",
      q({ Played: { date_added: "2025-01-01" }, "Para llorar": {} }),
      q({ PC: { url: "x" } }),
      "5",
      "Inolvidable",
      q([{ date_finished: "2025-02-10", seconds_played: 57600 }]),
      "",
      q({ Adventure: { url: "y" } }),
      "2019-05-28",
      "",
      "",
    ].join(",") +
    "\n" +
    [
      "2",
      "Silksong",
      q({ "Wish List": {} }),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ].join(",") +
    "\n";
  const { source, candidates } = readCsv(csv);
  expect(source).toBe("grouvee");
  expect(candidates).toEqual([
    {
      title: "Outer Wilds",
      platforms: ["PC"],
      stores: [],
      status: "completado",
      rating: 10,
      minutes: 960,
      completedOn: "2025-02-10",
      review: "Inolvidable",
      tags: ["Para llorar"],
      genres: ["Adventure"],
    },
    {
      title: "Silksong",
      platforms: ["PC"],
      stores: [],
      status: "pendiente",
      wishlist: true,
    },
  ]);
});

it("understands Backloggd statuses and five-star ratings", () => {
  const { source, candidates } = readCsv(
    "Name,Status,Rating\nElden Ring,Played,4.5\nTunic,Shelved,3\nHades II,Wishlist,\n",
  );
  expect(source).toBe("generic");
  expect(candidates.map((c) => [c.status, c.rating, !!c.wishlist])).toEqual([
    ["completado", 9, false],
    ["en pausa", 6, false],
    ["pendiente", undefined, true],
  ]);
});

it("exports and re-imports tags, format, edition and who recommended it", () => {
  const s = lib([
    game("a", {
      title: "Okami",
      tags: ["Relax", "Arte"],
      format: "físico",
      edition: "HD",
      recommendedBy: "Ana",
      favorite: true,
    }),
    game("b", { title: "Pragmata", wishlist: true }),
  ]);
  s.runs[0] = { ...s.runs[0], status: "completado", completedOn: "2026-05-01" };
  const { candidates } = readCsv(libraryToCsv(s));
  expect(candidates[0]).toMatchObject({
    title: "Okami",
    status: "completado",
    completedOn: "2026-05-01",
    tags: ["Relax", "Arte"],
    format: "físico",
    edition: "HD",
    recommendedBy: "Ana",
    favorite: true,
  });
  expect(candidates[1]).toMatchObject({ title: "Pragmata", wishlist: true });
  // Al importar, la partida terminada empieza y acaba en su fecha.
  const fresh = libraryFromCandidates(
    emptyLibrary(),
    importPlan(emptyLibrary(), candidates).fresh,
    now,
    today,
    (() => {
      let n = 0;
      return () => "id" + n++;
    })(),
  );
  expect(fresh.runs[0]).toMatchObject({
    status: "completado",
    startedOn: "2026-05-01",
    completedOn: "2026-05-01",
  });
  expect(fresh.games[0]).toMatchObject({
    tags: ["Relax", "Arte"],
    favorite: true,
  });
  const imported = applyCommand(
    emptyLibrary(),
    { type: "import", data: fresh, policy: "skip" },
    now,
  );
  expect(imported.games).toHaveLength(2);
});
