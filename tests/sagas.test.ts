import { it, expect } from "vitest";
import data from "../src/features/library/infrastructure/saga-guides.json";
import {
  sagaSchema,
  backupSchema,
} from "../src/features/library/application/validation";
import { applyCommand, type Saga } from "../src/features/library/domain/model";
import { sagaOrder, sagaCompleted } from "../src/features/library/domain/sagas";
import { demoLibrary } from "../src/features/library/infrastructure/demo";
const now = "2026-09-30T12:00:00.000Z";
it("validates all seven guides and backs them up without changing existing games", () => {
  expect(data).toHaveLength(7);
  let s = demoLibrary();
  const games = structuredClone(s.games);
  for (const guide of data)
    s = applyCommand(
      s,
      { type: "save-saga", saga: sagaSchema.parse(guide) },
      now,
    );
  expect(
    backupSchema.parse({ version: 1, exportedAt: now, data: s }).data.sagas,
  ).toHaveLength(7);
  expect(s.games).toEqual(games);
  const deleted = applyCommand(s, { type: "delete-saga", id: data[0].id }, now);
  expect(deleted.games).toEqual(games);
  expect(deleted.sagas).toHaveLength(6);
});
it("keeps editorial order distinct from release order and treats missing dates as unknown", () => {
  const saga = structuredClone(data[0]) as Saga;
  expect(sagaOrder(saga)[0].catalogId).toBe(saga.entries[0].catalogId);
  saga.entries = [
    { ...saga.entries[0], releaseDate: "" },
    { ...saga.entries[1], releaseDate: "2000-01-01" },
  ];
  saga.order = "release";
  expect(sagaOrder(saga)[0].releaseDate).toBe("2000-01-01");
  expect(saga.entries[0].releaseDate).toBe("");
});
it("progress uses owned catalog identity and any completed replay", () => {
  const s = demoLibrary(),
    g = s.games[0];
  g.catalogId = 1219;
  const entry = (data[0] as Saga).entries[0];
  expect(sagaCompleted(s, entry)).toBe(false);
  s.runs.push({
    ...s.runs[0],
    id: "done",
    gameId: g.id,
    status: "completado",
    completedOn: "2026-09-30",
  });
  expect(sagaCompleted(s, entry)).toBe(true);
});
it("rejects duplicate titles within a guide and unsafe cover URLs", () => {
  const saga = structuredClone(data[0]) as Saga;
  saga.entries.push(saga.entries[0]);
  expect(() =>
    applyCommand(demoLibrary(), { type: "save-saga", saga }, now),
  ).toThrow();
  saga.entries[0] = { ...saga.entries[0], cover: "javascript:alert(1)" };
  expect(() => sagaSchema.parse(saga)).toThrow();
});
