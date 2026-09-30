import { expect, it } from "vitest";
import { activityId, applyCommand } from "../src/features/library/domain/model";
import { commandSchema } from "../src/features/library/application/validation";
import { igdbTimes } from "../src/features/library/domain/daily";
import { demoLibrary } from "../src/features/library/infrastructure/demo";
const now = "2026-09-29T12:00:00.000Z";

it("no borra la actividad de otro día aunque el cliente reutilice el id anterior", () => {
  let s = demoLibrary();
  const first = s.activities[0],
    date = first.date === "2020-01-01" ? "2020-01-02" : "2020-01-01";
  s = applyCommand(
    s,
    {
      type: "save-activity",
      activity: {
        ...first,
        id: activityId(first.gameId, date),
        date,
        note: "otro día",
      },
    },
    now,
  );
  expect(() =>
    applyCommand(
      s,
      {
        type: "save-activity",
        previousId: first.id,
        activity: { ...first, date },
      },
      now,
    ),
  ).toThrow(/Ya hay actividad/);
});

it("rechaza actividades cuyo id no corresponde a juego y fecha", () => {
  expect(
    commandSchema.safeParse({
      type: "save-activity",
      activity: {
        id: "hades_2026-01-01",
        gameId: "hades",
        date: "2026-01-02",
        note: "",
      },
    }).success,
  ).toBe(false);
});

it("el cambio de estado en lote conserva la fecha de juegos ya completados", () => {
  const s = demoLibrary();
  const done = s.runs.find((r) => r.status === "completado")!;
  const next = applyCommand(
    s,
    {
      type: "batch-status",
      gameIds: [done.gameId],
      status: "completado",
      date: "2099-01-01",
    },
    now,
  );
  expect(next.runs.find((r) => r.id === done.id)!.completedOn).toBe(
    done.completedOn,
  );
});

it("al borrar un juego las sagas dejan de apuntar a él", () => {
  let s = demoLibrary();
  const game = s.games[0];
  s = applyCommand(
    s,
    {
      type: "save-saga",
      saga: {
        id: "mi-saga",
        name: "Mi saga",
        description: "",
        order: "recommended",
        source: "",
        entries: [
          {
            gameId: game.id,
            title: game.title,
            releaseDate: "",
            chapter: "",
            note: "",
            optional: false,
          },
        ],
      },
    },
    now,
  );
  const next = applyCommand(s, { type: "delete-game", id: game.id }, now);
  expect(next.sagas![0].entries[0].gameId).toBeUndefined();
  expect(next.sagas![0].entries[0].title).toBe(game.title);
});

it("descarta tiempos de IGDB que redondean a cero horas", () => {
  expect(igdbTimes({ hastily: 100, normally: 3600 })).toEqual({
    extras: { hours: 1, source: "IGDB" },
  });
});

it("los datos de ejemplo nunca quedan en el futuro", () => {
  const s = demoLibrary();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
  for (const a of s.activities) expect(a.date <= today).toBe(true);
  for (const r of s.runs)
    if (r.completedOn) expect(r.completedOn <= today).toBe(true);
});
