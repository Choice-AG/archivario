import { describe, it, expect } from "vitest";
import {
  applyCommand,
  activityId,
  dateInZone,
  emptyLibrary,
  monthlySummary,
  importPreview,
} from "../src/features/library/domain/model";
import {
  backupSchema,
  commandSchema,
} from "../src/features/library/application/validation";
import { demoLibrary } from "../src/features/library/infrastructure/demo";
const now = "2026-09-29T12:00:00.000Z";
describe("Biblioteca y diario", () => {
  it("solo registra una actividad por juego y día", () => {
    const s = demoLibrary(),
      a = {
        id: activityId("hades", "2026-09-29"),
        gameId: "hades",
        date: "2026-09-29",
        note: "",
        runId: "hades-run",
      };
    const once = applyCommand(s, { type: "save-activity", activity: a }, now),
      twice = applyCommand(once, { type: "save-activity", activity: a }, now);
    expect(twice.activities.filter((x) => x.id === a.id)).toHaveLength(1);
  });
  it("cambia la fecha sin dejar el registro anterior", () => {
    const s = demoLibrary(),
      old = s.activities[0],
      date = "2026-09-26";
    const next = applyCommand(
      s,
      {
        type: "save-activity",
        previousId: old.id,
        activity: { ...old, id: activityId(old.gameId, date), date },
      },
      now,
    );
    expect(next.activities.some((a) => a.id === old.id)).toBe(false);
    expect(next.activities).toHaveLength(s.activities.length);
  });
  it("no sobrescribe otro día al mover actividad", () => {
    let s = demoLibrary();
    const first = s.activities[0],
      second = {
        ...first,
        id: activityId(first.gameId, "2025-01-01"),
        date: "2025-01-01",
      };
    s = applyCommand(s, { type: "save-activity", activity: second }, now);
    expect(() =>
      applyCommand(
        s,
        { type: "save-activity", previousId: first.id, activity: second },
        now,
      ),
    ).toThrow("Ya hay actividad");
  });
  it("rechaza partidas de otro juego", () => {
    expect(() =>
      applyCommand(
        demoLibrary(),
        {
          type: "save-activity",
          activity: {
            id: activityId("hades", "2026-09-29"),
            gameId: "hades",
            date: "2026-09-29",
            note: "",
            runId: "hollow-run",
          },
        },
        now,
      ),
    ).toThrow();
  });
  it("rechaza valoraciones entre pasos y fechas imposibles", () => {
    const s = demoLibrary();
    expect(
      commandSchema.safeParse({
        type: "save-game",
        game: { ...s.games[0], rating: 8.3 },
      }).success,
    ).toBe(false);
    expect(
      commandSchema.safeParse({
        type: "save-activity",
        activity: { id: "x", gameId: "hades", date: "2026-02-30", note: "" },
      }).success,
    ).toBe(false);
  });
  it("respeta el día local", () => {
    expect(dateInZone(new Date("2026-09-28T23:30:00Z"), "Europe/Madrid")).toBe(
      "2026-09-29",
    );
    expect(
      dateInZone(new Date("2026-09-28T23:30:00Z"), "America/Mexico_City"),
    ).toBe("2026-09-28");
  });
  it("limita próximos a tres juegos", () => {
    let s = demoLibrary();
    s = applyCommand(
      s,
      { type: "save-game", game: { ...s.games[0], next: true } },
      now,
    );
    expect(() =>
      applyCommand(
        s,
        { type: "save-game", game: { ...s.games[1], next: true } },
        now,
      ),
    ).toThrow("tres");
  });
  it("conserva el historial de rejugadas", () => {
    const s = demoLibrary(),
      r = {
        ...s.runs[0],
        id: "rerun",
        label: "Segunda partida",
        status: "pendiente" as const,
      };
    const next = applyCommand(
      s,
      { type: "save-run", run: r, primary: true },
      now,
    );
    expect(next.runs).toHaveLength(s.runs.length + 1);
    expect(next.runs.some((x) => x.id === s.runs[0].id)).toBe(true);
    expect(next.games[0].primaryRunId).toBe("rerun");
  });
  it("no deriva tiempos de la actividad", () => {
    const s = demoLibrary(),
      next = applyCommand(
        s,
        {
          type: "save-activity",
          activity: {
            id: activityId("hades", "2026-01-01"),
            date: "2026-01-01",
            gameId: "hades",
            note: "",
          },
        },
        now,
      );
    expect(next.runs.map((r) => r.completionMinutes)).toEqual(
      s.runs.map((r) => r.completionMinutes),
    );
    expect(Object.keys(monthlySummary(next, "2026-01"))).toEqual([
      "games",
      "days",
      "completed",
    ]);
  });
  it("borra juego y sus registros relacionados", () => {
    const next = applyCommand(
      demoLibrary(),
      { type: "delete-game", id: "hollow" },
      now,
    );
    expect(next.games.some((g) => g.id === "hollow")).toBe(false);
    expect(next.runs.some((r) => r.gameId === "hollow")).toBe(false);
    expect(next.activities.some((a) => a.gameId === "hollow")).toBe(false);
  });
});
describe("Importación", () => {
  it("permite ida y vuelta con notas", () => {
    const data = demoLibrary();
    data.games[0].spoilerNote = "Nota privada";
    const backup = backupSchema.parse(
      JSON.parse(JSON.stringify({ version: 1, exportedAt: now, data })),
    );
    expect(
      applyCommand(
        emptyLibrary(),
        { type: "import", policy: "replace", data: backup.data },
        now,
      ).games[0].spoilerNote,
    ).toBe("Nota privada");
  });
  it("rechaza versiones y referencias huérfanas", () => {
    const data = demoLibrary();
    expect(
      backupSchema.safeParse({ version: 2, exportedAt: now, data }).success,
    ).toBe(false);
    data.runs = [];
    expect(
      backupSchema.safeParse({ version: 1, exportedAt: now, data }).success,
    ).toBe(false);
  });
  it("previsualiza y omite duplicados", () => {
    const s = demoLibrary(),
      incoming = structuredClone(s);
    incoming.games[0].review = "Nota importada";
    expect(importPreview(s, incoming).duplicates).toHaveLength(6);
    const next = applyCommand(
      s,
      { type: "import", policy: "skip", data: incoming },
      now,
    );
    expect(next.games).toEqual(s.games);
    expect(next.activities).toEqual(s.activities);
  });
  it("rechaza títulos manuales equivalentes", () => {
    const s = demoLibrary(),
      game = {
        ...s.games[0],
        id: "copy",
        title: "  HOLLOW KNIGHT  ",
        primaryRunId: "copy-run",
      };
    expect(() =>
      applyCommand(
        s,
        {
          type: "save-game",
          game,
          run: { ...s.runs[0], id: "copy-run", gameId: "copy" },
        },
        now,
      ),
    ).toThrow("duplicados");
  });
});
