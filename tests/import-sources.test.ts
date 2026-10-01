import { expect, it } from "vitest";
import {
  candidatesFromCsv,
  candidatesFromSteam,
  importPlan,
  libraryFromCandidates,
  parseCsv,
} from "../src/features/library/domain/import-sources";
import { applyCommand } from "../src/features/library/domain/model";
import { librarySchema } from "../src/features/library/application/validation";
import { demoLibrary } from "../src/features/library/infrastructure/demo";

it("lee CSV con comillas, punto y coma y saltos de línea dentro de campos", () => {
  expect(parseCsv('a;b\n"x;1";"di ""hola""\nadiós"\n')).toEqual([
    ["a", "b"],
    ["x;1", 'di "hola"\nadiós'],
  ]);
  expect(parseCsv("﻿t,p\r\nZelda,Switch\r\n")).toEqual([
    ["t", "p"],
    ["Zelda", "Switch"],
  ]);
});

it("reconoce columnas en español o inglés y normaliza estado y nota", () => {
  const rows = candidatesFromCsv(
    "Title,Platform,Status,Rating,Hours,Store\n" +
      "Celeste,Switch/PC,Completed,9.3,8,Nintendo eShop\n" +
      "Sin datos,,,,,\n" +
      ",PC,,,,\n",
  );
  expect(rows).toEqual([
    {
      title: "Celeste",
      platforms: ["Switch", "PC"],
      stores: ["Nintendo eShop"],
      status: "completado",
      rating: 9.5,
      hours: 8,
    },
    { title: "Sin datos", platforms: ["PC"], stores: [], status: "pendiente" },
  ]);
  expect(() => candidatesFromCsv("Plataforma\nPC")).toThrow(/título/);
});

it("salta duplicados de la biblioteca y del propio archivo", () => {
  const state = demoLibrary();
  const plan = importPlan(state, [
    ...candidatesFromCsv("Título\nHADES\nNuevo juego\nnuevo juego\n"),
  ]);
  expect(plan.fresh.map((c) => c.title)).toEqual(["Nuevo juego"]);
  expect(plan.duplicates).toEqual(["HADES", "nuevo juego"]);
});

it("convierte los candidatos en una importación válida para el dominio", () => {
  const state = demoLibrary();
  let n = 0;
  const data = libraryFromCandidates(
    state,
    [
      ...candidatesFromSteam([{ appid: 620, name: "Portal 2", minutes: 300 }]),
      ...candidatesFromCsv("Título,Estado\nOuter Wilds 2,completado\n"),
    ],
    "2026-10-02T12:00:00.000Z",
    "2026-10-02",
    () => "imp-" + n++,
  );
  expect(librarySchema.safeParse(data).success).toBe(true);
  expect(data.games[0].cover).toContain("steamstatic.com/steam/apps/620/");
  expect(data.runs[1]).toMatchObject({
    status: "completado",
    completedOn: "2026-10-02",
  });
  const next = applyCommand(
    state,
    { type: "import", data, policy: "skip" },
    "2026-10-02T12:00:00.000Z",
  );
  expect(next.games).toHaveLength(state.games.length + 2);
});

it("exporta un CSV que se vuelve a importar igual y no ejecuta fórmulas", async () => {
  const { libraryToCsv } =
    await import("../src/features/library/domain/import-sources");
  const state = demoLibrary();
  state.games[0].title = '=HYPERLINK("x") "trampa"';
  const csv = libraryToCsv(state);
  expect(csv.startsWith("\uFEFFTítulo;Plataforma;")).toBe(true);
  expect(csv).toContain(`"'=HYPERLINK(""x"") ""trampa"""`);
  const again = candidatesFromCsv(csv);
  expect(again.map((c) => c.title)).toEqual(state.games.map((g) => g.title));
  expect(again.map((c) => c.status)).toEqual(
    state.games.map(
      (g) => state.runs.find((r) => r.id === g.primaryRunId)!.status,
    ),
  );
  expect(again[0].platforms).toEqual(state.games[0].platforms);
});
