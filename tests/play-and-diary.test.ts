import { expect, it } from "vitest";
import {
  applyCommand,
  assertLibrary,
  emptyLibrary,
  type Game,
  type Library,
  type Run,
} from "../src/features/library/domain/model";
import {
  activitySchema,
  commandSchema,
} from "../src/features/library/application/validation";
import { suggestTonight } from "../src/features/library/domain/tonight";
import {
  clock,
  formatMinutes,
  minutesIn,
  playedTime,
  sessionToLog,
} from "../src/features/library/domain/session";
import {
  releaseCandidates,
  releaseLabel,
  releases,
  releasesIn,
} from "../src/features/library/domain/releases";
import {
  moveToTop,
  priorityGames,
} from "../src/features/library/domain/planning";
import { sortGames } from "../src/features/library/domain/insights";
import { matchesGame } from "../src/features/library/domain/daily";
import { profileStats } from "../src/features/library/domain/profile";

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
const run = (gameId: string, extra: Partial<Run> = {}): Run => ({
  id: gameId + "-run",
  gameId,
  label: "Primera partida",
  platform: "PC",
  status: "pendiente",
  completion: "sin especificar",
  startedOn: "2026-01-01",
  whereLeft: "",
  ...extra,
});

function fixture(): Library {
  const s = emptyLibrary();
  s.games = [
    game("a", { times: { main: { hours: 10, source: "IGDB" } } }),
    game("b"),
    game("c", { next: true }),
    game("d", { approximateHours: 5, notesBefore: "Instala el parche" }),
    game("e", { wishlist: true, catalogId: 5, releaseDate: "2026-12-01" }),
    game("f", { catalogId: 6 }),
    game("g", { catalogId: 7, releaseDate: "2027-03-01" }),
    game("h", { platforms: ["Switch"], catalogId: 8 }),
  ];
  s.runs = [
    run("a", { status: "jugando", whereLeft: "Antes del jefe final" }),
    run("b", { status: "en pausa" }),
    run("c"),
    run("d"),
    run("e"),
    run("f", { status: "completado", completedOn: "2026-02-01" }),
    run("g"),
    run("h", { platform: "Switch" }),
  ];
  s.activities = [
    {
      id: "a_2026-10-12",
      gameId: "a",
      runId: "a-run",
      date: "2026-10-12",
      note: "",
      minutes: 480,
    },
    {
      id: "a_2026-10-10",
      gameId: "a",
      runId: "a-run",
      date: "2026-10-10",
      note: "",
      minutes: 60,
    },
    { id: "b_2026-08-01", gameId: "b", date: "2026-08-01", note: "" },
  ];
  s.profile.priority = ["d", "c"];
  return s;
}

it("suggests what to play tonight and explains why", () => {
  const s = fixture();
  const all = suggestTonight(
    s,
    { time: "rato", platform: "", mood: "igual" },
    today,
  );
  const ids = all.map((x) => x.game.id);
  // Ni deseos, ni completados, ni lo que aún no ha salido.
  expect(ids).not.toContain("e");
  expect(ids).not.toContain("f");
  expect(ids).not.toContain("g");
  expect(ids[0]).toBe("a");
  expect(all[0].reasons).toEqual([
    "Puedes terminarlo esta noche",
    "Lo jugaste ayer",
    "Le quedan unas 1 h",
  ]);
  const fresh = suggestTonight(
    s,
    { time: "rato", platform: "", mood: "nuevo" },
    today,
  );
  expect(fresh.map((x) => x.game.id)).toEqual(["d", "c", "h"]);
  expect(fresh[0].reasons).toContain("Es el n.º 1 de tu prioridad");
  expect(fresh[0].reasons).toContain("Es corto: unas 5 h en total");
  expect(
    suggestTonight(s, { time: "noche", platform: "", mood: "seguir" }, today)
      .map((x) => x.game.id)
      .sort(),
  ).toEqual(["a", "b"]);
  expect(
    suggestTonight(
      s,
      { time: "tarde", platform: "Switch", mood: "igual" },
      today,
    ).map((x) => x.game.id),
  ).toEqual(["h"]);
});

it("formats and sums played time", () => {
  expect(formatMinutes(45)).toBe("45 min");
  expect(formatMinutes(90)).toBe("1 h 30 min");
  expect(formatMinutes(120)).toBe("2 h");
  expect(clock(3725)).toBe("1:02:05");
  const s = fixture();
  expect(playedTime(s, "a")).toEqual({ minutes: 540, sessions: 2 });
  expect(minutesIn(s, "2026-10")).toBe(540);
  expect(minutesIn(s, "2026-08")).toBe(0);
  // Lo apuntado cuenta si supera al tiempo final de la partida.
  expect(profileStats(s).hours).toBe(9);
});

it("proposes the session from the timer in your time zone", () => {
  const timer = {
    gameId: "a",
    runId: "a-run",
    startedAt: "2026-10-12T22:30:00.000Z",
  };
  const start = new Date(timer.startedAt).getTime();
  // En Madrid ya es 13 de octubre a las 00:30.
  expect(sessionToLog(timer, start + 95 * 60000, "Europe/Madrid")).toEqual({
    date: "2026-10-13",
    minutes: 95,
    forgotten: false,
  });
  expect(sessionToLog(timer, start + 20000, "Europe/Madrid").minutes).toBe(1);
  expect(
    sessionToLog(timer, start + 30 * 3600000, "Europe/Madrid"),
  ).toMatchObject({ minutes: 1440, forgotten: true });
});

it("starts, logs and discards sessions", () => {
  const s = fixture();
  const timer = { gameId: "d", runId: "d-run", startedAt: now };
  const started = applyCommand(s, { type: "timer", timer }, now);
  expect(started.profile.timer).toEqual(timer);
  // Empezar una sesión pone el juego en «jugando».
  expect(started.runs.find((r) => r.id === "d-run")!.status).toBe("jugando");
  // Guardar el perfil no pierde la sesión ni el orden.
  const named = applyCommand(
    started,
    { type: "profile", profile: { ...emptyLibrary().profile, name: "Ana" } },
    now,
  );
  expect(named.profile).toMatchObject({
    name: "Ana",
    timer,
    priority: ["d", "c"],
  });
  const logged = applyCommand(
    named,
    {
      type: "log-session",
      gameId: "d",
      runId: "d-run",
      date: today,
      minutes: 50,
      note: "Primer jefe",
    },
    now,
  );
  expect(logged.profile.timer).toBeUndefined();
  const again = applyCommand(
    logged,
    {
      type: "log-session",
      gameId: "d",
      runId: "d-run",
      date: today,
      minutes: 40,
      note: "Segundo",
    },
    now,
  );
  expect(again.activities.find((a) => a.id === "d_" + today)).toEqual({
    id: "d_" + today,
    gameId: "d",
    runId: "d-run",
    date: today,
    note: "Primer jefe\nSegundo",
    minutes: 90,
  });
  expect(() =>
    applyCommand(
      again,
      {
        type: "log-session",
        gameId: "d",
        runId: "d-run",
        date: today,
        minutes: 1400,
      },
      now,
    ),
  ).toThrow("24 horas");
  const discarded = applyCommand(started, { type: "timer" }, now);
  expect(discarded.profile.timer).toBeUndefined();
  // Borrar el juego quita su sesión y su sitio en la prioridad.
  const removed = applyCommand(started, { type: "delete-game", id: "d" }, now);
  expect(removed.profile.timer).toBeUndefined();
  expect(removed.profile.priority).toEqual(["c"]);
});

it("keeps the time of a day when saving several games", () => {
  const s = fixture();
  const next = applyCommand(
    s,
    {
      type: "save-day",
      date: "2026-10-12",
      items: [
        { gameId: "a", runId: "a-run", note: "Fin", minutes: 30 },
        { gameId: "b", runId: "b-run", note: "" },
      ],
    },
    now,
  );
  expect(next.activities.find((a) => a.id === "a_2026-10-12")!.minutes).toBe(
    30,
  );
  expect(
    next.activities.find((a) => a.id === "b_2026-10-12"),
  ).not.toHaveProperty("minutes");
});

it("validates times, priorities and timers", () => {
  const base = {
    id: "a_2026-10-12",
    gameId: "a",
    date: "2026-10-12",
    note: "",
  };
  expect(activitySchema.safeParse({ ...base, minutes: 90 }).success).toBe(true);
  expect(activitySchema.safeParse({ ...base, minutes: 0 }).success).toBe(false);
  expect(activitySchema.safeParse({ ...base, minutes: 1441 }).success).toBe(
    false,
  );
  expect(activitySchema.safeParse({ ...base, minutes: 1.5 }).success).toBe(
    false,
  );
  expect(
    commandSchema.safeParse({
      type: "log-session",
      gameId: "a",
      runId: "a-run",
      date: today,
      minutes: 30,
    }).success,
  ).toBe(true);
  expect(
    commandSchema.safeParse({
      type: "timer",
      timer: { gameId: "a", runId: "a-run", startedAt: "ayer" },
    }).success,
  ).toBe(false);
  const s = fixture();
  s.profile.priority = ["a", "no-existe"];
  expect(() => assertLibrary(s)).toThrow("prioridad");
  const t = fixture();
  t.profile.timer = { gameId: "a", runId: "b-run", startedAt: now };
  expect(() => assertLibrary(t)).toThrow("sesión");
  const ordered = applyCommand(
    fixture(),
    { type: "save-priority", gameIds: ["h", "c", "h"] },
    now,
  );
  expect(ordered.profile.priority).toEqual(["h", "c"]);
});

it("lists upcoming and recent releases and what to ask IGDB", () => {
  const s = fixture();
  s.games.find((g) => g.id === "h")!.releaseDate = "2026-10-05";
  const { upcoming, recent } = releases(s, today);
  expect(upcoming.map((g) => g.id)).toEqual(["e", "g"]);
  expect(recent.map((g) => g.id)).toEqual(["h"]);
  expect(releasesIn(s, "2026-12").map((g) => g.id)).toEqual(["e"]);
  // Sin catálogo o ya completados no se consultan; los deseos van primero.
  expect(releaseCandidates(s, today).map((g) => g.id)).toEqual(["e", "g"]);
  expect(releaseLabel("2026-10-13", today)).toBe("Sale hoy");
  expect(releaseLabel("2026-10-14", today)).toBe("Sale mañana");
  expect(releaseLabel("2026-10-23", today)).toBe("Faltan 10 días");
  expect(releaseLabel("2026-10-10", today)).toBe("Salió hace 3 días");
  const linked = applyCommand(
    s,
    {
      type: "link-catalog",
      items: [
        { gameId: "g", catalogId: 7, releaseDate: "2027-06-01" },
        { gameId: "e", catalogId: 5, releaseDate: "" },
      ],
    },
    now,
  );
  expect(linked.games.find((g) => g.id === "g")!.releaseDate).toBe(
    "2027-06-01",
  );
  expect(linked.games.find((g) => g.id === "e")).not.toHaveProperty(
    "releaseDate",
  );
});

it("orders pending games by your priority", () => {
  const s = fixture();
  expect(priorityGames(s).map((g) => g.id)).toEqual(["d", "c", "e", "g", "h"]);
  expect(moveToTop(["a", "b", "c"], 2)).toEqual(["c", "a", "b"]);
  expect(
    sortGames(
      s.games.filter((g) => ["c", "d", "h"].includes(g.id)),
      s,
      "priority",
    ).map((g) => g.id),
  ).toEqual(["d", "c", "h"]);
});

it("searches the notes before starting, and the final one only with spoilers", () => {
  const s = fixture();
  const d = s.games.find((g) => g.id === "d")!;
  d.notesAfter = "Leer el análisis del final";
  expect(matchesGame(s, d, "parche")).toBe(true);
  expect(matchesGame(s, d, "análisis")).toBe(false);
  expect(matchesGame(s, d, "análisis", true)).toBe(true);
});
