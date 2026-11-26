import { expect, it } from "vitest";
import {
  applyCommand,
  emptyLibrary,
  type Activity,
  type Game,
  type Library,
  type Run,
} from "../src/features/library/domain/model";
import {
  allMoments,
  backlogHours,
  dayNotices,
  groupByDay,
  onThisDay,
  searchJournal,
} from "../src/features/library/domain/memories";
import {
  commandSchema,
  librarySchema,
} from "../src/features/library/application/validation";

const NOW = "2026-11-26T10:00:00.000Z";
const game = (id: string, extra: Partial<Game> = {}): Game => ({
  id,
  title: "Juego " + id.toUpperCase(),
  genres: [],
  platforms: ["PC"],
  stores: [],
  favorite: false,
  next: false,
  review: "",
  spoilerNote: "",
  primaryRunId: id + "-run",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});
const run = (gameId: string, extra: Partial<Run> = {}): Run => ({
  id: gameId + "-run",
  gameId,
  label: "Primera partida",
  platform: "PC",
  status: "pendiente",
  completion: "sin especificar",
  startedOn: "2024-01-01",
  whereLeft: "",
  ...extra,
});
const day = (gameId: string, date: string, note = ""): Activity => ({
  id: gameId + "_" + date,
  gameId,
  runId: gameId + "-run",
  date,
  note,
});
function fixture(): Library {
  const s = emptyLibrary();
  s.games = [
    game("a", { approximateHours: 12 }),
    game("b", { times: { main: { hours: 30.4, source: "IGDB" } } }),
    game("c"),
    game("d", { wishlist: true, approximateHours: 99 }),
  ];
  s.runs = [run("a"), run("b"), run("c"), run("d")];
  s.activities = [
    day("a", "2025-11-26", "El jefe final"),
    day("b", "2024-11-26"),
    day("a", "2026-11-26"),
    day("c", "2025-11-25", "Otra cosa"),
  ];
  return s;
}

it("recuerda lo que jugabas tal día como hoy en otros años", () => {
  const found = onThisDay(fixture(), "2026-11-26");
  expect(found.map((f) => [f.game.id, f.years])).toEqual([
    ["a", 1],
    ["b", 2],
  ]);
  expect(onThisDay(fixture(), "2026-03-01")).toEqual([]);
});

it("busca en el diario sin distinguir tildes y agrupa por día", () => {
  const s = fixture();
  const games = new Map(s.games.map((g) => [g.id, g]));
  expect(searchJournal(s.activities, games, "JEFE").map((a) => a.id)).toEqual([
    "a_2025-11-26",
  ]);
  expect(searchJournal(s.activities, games, "juego c")).toHaveLength(1);
  expect(searchJournal(s.activities, games, " ")).toHaveLength(4);
  const sorted = [...s.activities, day("b", "2026-11-26")].sort((x, y) =>
    y.date.localeCompare(x.date),
  );
  expect(groupByDay(sorted)[0]).toMatchObject({ date: "2026-11-26" });
  expect(groupByDay(sorted)[0].items).toHaveLength(2);
});

it("suma las horas de lo pendiente sin contar la lista de deseos", () => {
  expect(backlogHours(fixture())).toEqual({ games: 3, hours: 42, unknown: 1 });
});

it("avisa de lo que sale pronto y de una sesión olvidada", () => {
  const s = fixture();
  s.games[3] = { ...s.games[3], catalogId: 5, releaseDate: "2026-11-28" };
  s.games[0] = { ...s.games[0], catalogId: 6, releaseDate: "2026-11-26" };
  s.profile.timer = {
    gameId: "b",
    runId: "b-run",
    startedAt: "2026-11-25T08:00:00.000Z",
  };
  const notices = dayNotices(s, "2026-11-26", new Date(NOW).getTime());
  expect(notices.map((n) => n.kind)).toEqual(["session", "release", "release"]);
  expect(notices[1].text).toBe("Hoy sale Juego A.");
  expect(notices[2].text).toBe("Juego D sale en 2 días.");
});

it("guarda vistas, momentos, extras y el tiempo de Steam", () => {
  let s = fixture();
  const view = {
    id: "v1",
    name: "Cortos en PC",
    filters: { platform: "PC", duration: "short" },
  };
  expect(commandSchema.safeParse({ type: "save-view", view }).success).toBe(
    true,
  );
  expect(
    commandSchema.safeParse({
      type: "save-view",
      view: { ...view, filters: { query: "x" } },
    }).success,
  ).toBe(false);
  s = applyCommand(s, { type: "save-view", view }, NOW);
  s = applyCommand(
    s,
    { type: "save-view", view: { ...view, name: "Cortos" } },
    NOW,
  );
  expect(s.profile.views).toEqual([{ ...view, name: "Cortos" }]);
  // Guardar el perfil desde ajustes no borra las vistas.
  s = applyCommand(
    s,
    { type: "profile", profile: { name: "Alex", bio: "", timezone: "UTC" } },
    NOW,
  );
  expect(s.profile.views).toHaveLength(1);
  s = applyCommand(s, { type: "delete-view", id: "v1" }, NOW);
  expect(s.profile.views).toBeUndefined();

  s = applyCommand(
    s,
    {
      type: "save-game",
      game: {
        ...s.games[0],
        moments: [
          { id: "m1", text: "«No estás solo»", date: "2026-05-01" },
          { id: "m2", text: "La llegada a la ciudad" },
        ],
        extras: [{ id: "e1", title: "La expansión", done: true }],
      },
    },
    NOW,
  );
  expect(allMoments(s).map((m) => m.moment.id)).toEqual(["m1", "m2"]);
  expect(librarySchema.safeParse(s).success).toBe(true);
  const before = s.games[1].updatedAt;
  s = applyCommand(
    s,
    { type: "steam-sync", items: [{ gameId: "b", appId: 620, minutes: 754 }] },
    NOW,
  );
  expect(s.games[1].steam).toEqual({ appId: 620, minutes: 754 });
  expect(s.games[1].updatedAt).toBe(before);
  expect(() =>
    applyCommand(
      s,
      { type: "steam-sync", items: [{ gameId: "zz", appId: 1, minutes: 1 }] },
      NOW,
    ),
  ).toThrow();
});
