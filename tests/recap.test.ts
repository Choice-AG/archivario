import { expect, it } from "vitest";
import {
  emptyLibrary,
  type Activity,
  type Game,
  type Library,
  type Run,
} from "../src/features/library/domain/model";
import {
  lastMonths,
  minutesBy,
  minutesByMonth,
  periodSummary,
} from "../src/features/library/domain/recap";
import { compactTime } from "../src/features/library/domain/session";
import { recapData } from "../src/features/library/presentation/recap-data";

const game = (id: string, extra: Partial<Game> = {}): Game => ({
  id,
  title: id.toUpperCase(),
  genres: ["RPG"],
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
  status: "jugando",
  completion: "sin especificar",
  startedOn: "2025-12-01",
  whereLeft: "",
  ...extra,
});
const day = (gameId: string, date: string, minutes?: number): Activity => ({
  id: gameId + "_" + date,
  gameId,
  runId: gameId + "-run",
  date,
  note: "",
  ...(minutes ? { minutes } : {}),
});

function fixture(): Library {
  const s = emptyLibrary();
  s.profile.name = "Alex";
  s.games = [
    game("a", { rating: 9, cover: "https://images.igdb.com/a.jpg" }),
    game("b", { genres: ["Acción", "RPG"], platforms: ["Switch"] }),
    game("c", { rating: 7 }),
  ];
  s.runs = [
    run("a", { status: "completado", completedOn: "2026-03-10" }),
    run("b", { platform: "Switch" }),
    run("c"),
  ];
  s.activities = [
    day("a", "2026-03-01", 120),
    day("a", "2026-03-02", 90),
    day("b", "2026-03-02", 300),
    day("b", "2026-05-20"),
    day("c", "2025-12-31", 45),
  ];
  return s;
}

it("summarises a year and a month and finds what you played most", () => {
  const s = fixture();
  const year = periodSummary(s, "2026");
  expect(year).toMatchObject({ games: 2, days: 3, completed: 1, minutes: 510 });
  // Por tiempo apuntado: b (300) antes que a (210).
  expect(year.top.map((g) => g.id)).toEqual(["b", "a"]);
  expect(year.best?.id).toBe("a");
  expect(year.daysOf(s.games[1])).toBe(2);
  expect(periodSummary(s, "2026-05")).toMatchObject({ games: 1, minutes: 0 });
});

it("splits played time by month, platform and genre", () => {
  const s = fixture();
  expect(minutesByMonth(s, "2026")).toEqual([
    0, 0, 510, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  expect(minutesBy(s, "2026", "platform")).toEqual([
    { name: "Switch", minutes: 300 },
    { name: "PC", minutes: 210 },
  ]);
  expect(minutesBy(s, "2026", "genre")).toEqual([
    { name: "RPG", minutes: 510 },
    { name: "Acción", minutes: 300 },
  ]);
  // Los últimos meses cruzan el cambio de año.
  expect(lastMonths(s, "2026-03-15", 4)).toEqual([
    { month: "2025-12", minutes: 45 },
    { month: "2026-01", minutes: 0 },
    { month: "2026-02", minutes: 0 },
    { month: "2026-03", minutes: 510 },
  ]);
  expect([compactTime(45), compactTime(90), compactTime(750)]).toEqual([
    "45 min",
    "1,5 h",
    "13 h",
  ]);
});

it("builds the data for the year and month images", () => {
  const s = fixture();
  const year = recapData(s, "2026");
  expect(year).toMatchObject({
    title: "Mi 2026",
    subtitle: "Alex · Un año de juego",
    stats: [
      ["2", "juegos jugados"],
      ["3", "días de juego"],
      ["1", "completado"],
      ["8,5 h", "jugadas en total"],
    ],
    games: [
      { title: "B", detail: "5 h" },
      { title: "A", detail: "3,5 h", cover: "https://images.igdb.com/a.jpg" },
    ],
    lines: [
      "Mi favorito: A · 9/10",
      "Mi mes con más juego: marzo",
      "Terminé: A",
    ],
  });
  const month = recapData(s, "2026-05");
  expect(month.title).toBe("Mayo de 2026");
  expect(month.stats).toHaveLength(3);
  expect(month.games).toEqual([{ title: "B", detail: "1 día" }]);
});
