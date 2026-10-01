import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fake = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/server/firebase", () => ({
  db: () => (fake.current as { db: unknown }).db,
}));
vi.mock("@/server/lifecycle", () => ({
  deletionRef: (uid: string) => ({ path: "locks/" + uid }),
}));
import { createFakeFirestore } from "./support/fake-firestore";
import {
  chunk,
  FirebaseLibraryRepository,
} from "../src/features/library/infrastructure/firebase-repository";
import {
  activityId,
  applyCommand,
  type Library,
} from "../src/features/library/domain/model";
import { demoLibrary } from "../src/features/library/infrastructure/demo";

let f: ReturnType<typeof createFakeFirestore>;
const repo = new FirebaseLibraryRepository();
const now = "2026-10-02T12:00:00.000Z";
beforeEach(() => {
  f = createFakeFirestore();
  fake.current = f;
});
const save = (s: Library, update: (s: Library) => Library) =>
  repo.transact("alice", s.revision, update);

it("reparte en bloques respetando el tamaño máximo", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    i,
    pad: "x".repeat(90),
  }));
  const parts = chunk(items, 300);
  expect(parts.length).toBeGreaterThan(1);
  expect(parts.flat()).toEqual(items);
  for (const p of parts)
    expect(Buffer.byteLength(JSON.stringify(p))).toBeLessThanOrEqual(310);
});

it("migra el formato antiguo en la primera escritura y conserva la copia", async () => {
  const legacy = demoLibrary();
  f.store.set("users/alice/private/library", structuredClone(legacy));
  expect(await repo.read("alice")).toEqual(legacy);
  const next = await save(legacy, (s) =>
    applyCommand(
      s,
      { type: "profile", profile: { ...s.profile, name: "Ana" } },
      now,
    ),
  );
  expect(f.store.has("users/alice/private/library-v2")).toBe(true);
  expect(f.store.get("users/alice/private/library")).toEqual(legacy);
  const read = await repo.read("alice");
  expect(read.profile.name).toBe("Ana");
  expect(read.games).toEqual(next.games);
  expect(read.activities).toEqual(next.activities);
  expect(read.revision).toBe(legacy.revision + 1);
});

it("solo reescribe los bloques que cambian", async () => {
  const first = await save({ ...demoLibrary(), revision: 0 }, () => ({
    ...demoLibrary(),
    revision: 1,
  }));
  f.writes.length = 0;
  const game = first.games[0];
  await save(first, (s) =>
    applyCommand(
      s,
      {
        type: "save-activity",
        activity: {
          id: activityId(game.id, "2020-01-01"),
          gameId: game.id,
          date: "2020-01-01",
          note: "",
        },
      },
      now,
    ),
  );
  expect(f.writes.sort()).toEqual([
    // touch() cambia updatedAt del juego, así que también cambia su bloque.
    "set users/alice/libraryChunks/activities-0",
    "set users/alice/libraryChunks/games-0",
    "set users/alice/private/library-v2",
  ]);
});

it("guarda bibliotecas mayores que un documento de Firestore", async () => {
  const base = demoLibrary();
  const game = base.games[0];
  const activities = Array.from({ length: 12000 }, (_, i) => {
    const date = new Date(Date.UTC(1990, 0, 1) + i * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      id: activityId(game.id, date),
      gameId: game.id,
      date,
      note: "Un día largo de juego para recordar.",
    };
  });
  const big = { ...base, revision: 1, activities };
  await save({ ...base, revision: 0 }, () => big);
  const chunks = [...f.store.keys()].filter((k) => k.includes("activities-"));
  expect(chunks.length).toBeGreaterThan(1);
  for (const k of chunks)
    expect(Buffer.byteLength(JSON.stringify(f.store.get(k)))).toBeLessThan(
      1_000_000,
    );
  expect((await repo.read("alice")).activities).toHaveLength(12000);
  // Al reducir la biblioteca se eliminan los bloques sobrantes.
  await save(big, (s) => ({ ...s, revision: 2, activities: [] }));
  expect([...f.store.keys()].filter((k) => k.includes("activities-"))).toEqual(
    [],
  );
});

it("rechaza revisiones antiguas también con el formato nuevo", async () => {
  const first = await save({ ...demoLibrary(), revision: 0 }, () => ({
    ...demoLibrary(),
    revision: 1,
  }));
  await expect(save({ ...first, revision: 0 }, (s) => s)).rejects.toThrow(
    /otro dispositivo/,
  );
});

it("lee la revisión con un solo documento en ambos formatos", async () => {
  const legacy = { ...demoLibrary(), revision: 7 };
  f.store.set("users/alice/private/library", structuredClone(legacy));
  expect(await repo.revision("alice")).toBe(7);
  await save(legacy, (s) => ({ ...s, revision: 8 }));
  expect(await repo.revision("alice")).toBe(8);
  expect(await repo.revision("nadie")).toBe(0);
});
