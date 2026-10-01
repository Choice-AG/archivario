import { expect, it } from "vitest";
import {
  bestMatch,
  normalizeTitle,
} from "../src/features/library/domain/catalog-match";
import { applyCommand } from "../src/features/library/domain/model";
import { commandSchema } from "../src/features/library/application/validation";
import { demoLibrary } from "../src/features/library/infrastructure/demo";

const option = (catalogId: number, title: string) => ({
  catalogId,
  title,
  genres: ["RPG"],
  platforms: ["PC"],
});

it("normaliza títulos de Steam y elige la coincidencia exacta primero", () => {
  expect(normalizeTitle("DOOM™ Eternal: Deluxe")).toBe("doom eternal deluxe");
  expect(
    bestMatch("Hades", [option(1, "Hades II"), option(2, "Hades")]),
  ).toEqual({ option: option(2, "Hades"), exact: true });
  expect(bestMatch("Hades", [option(1, "Hades II")])).toEqual({
    option: option(1, "Hades II"),
    exact: false,
  });
  expect(bestMatch("Celeste", [option(3, "Outer Wilds")])).toBeUndefined();
});

it("vincula en bloque sin pisar portada ni géneros existentes", () => {
  const state = demoLibrary();
  const [withCover, other] = state.games;
  const command = commandSchema.parse({
    type: "link-catalog",
    items: [
      {
        gameId: withCover.id,
        catalogId: 999001,
        cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/x.jpg",
        genres: ["Nuevo"],
      },
      { gameId: other.id, catalogId: 999002 },
    ],
  });
  const next = applyCommand(state, command, "2026-10-02T12:00:00.000Z");
  const linked = next.games.find((g) => g.id === withCover.id)!;
  expect(linked.catalogId).toBe(999001);
  expect(linked.cover).toBe(withCover.cover);
  expect(linked.genres).toEqual(withCover.genres);
  expect(next.games.find((g) => g.id === other.id)!.catalogId).toBe(999002);
  // Dos juegos no pueden apuntar a la misma ficha.
  expect(() =>
    applyCommand(
      state,
      {
        type: "link-catalog",
        items: [
          { gameId: withCover.id, catalogId: 5 },
          { gameId: other.id, catalogId: 5 },
        ],
      },
      "2026-10-02T12:00:00.000Z",
    ),
  ).toThrow();
});

it("refrescar la nota de la crítica no mueve el juego en «última actividad»", () => {
  let state = demoLibrary();
  const game = state.games[0];
  state = applyCommand(
    state,
    { type: "link-catalog", items: [{ gameId: game.id, catalogId: 4242 }] },
    "2026-10-02T12:00:00.000Z",
  );
  const linkedAt = state.games[0].updatedAt;
  state = applyCommand(
    state,
    {
      type: "link-catalog",
      items: [
        { gameId: game.id, catalogId: 4242, critic: { score: 91, count: 40 } },
      ],
    },
    "2026-10-09T12:00:00.000Z",
  );
  expect(state.games[0].critic).toEqual({ score: 91, count: 40 });
  expect(state.games[0].updatedAt).toBe(linkedAt);
});
