// @vitest-environment jsdom
import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BulkLink } from "../src/features/library/presentation/bulk-link";
import { demoLibrary } from "../src/features/library/infrastructure/demo";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("busca cada juego, propone su ficha y vincula las elegidas de una vez", async () => {
  const state = demoLibrary();
  const request = vi.fn(async (url: string) => {
    const q = decodeURIComponent(url.match(/q=([^&]+)/)![1]);
    return new Response(
      JSON.stringify({
        items:
          q === "Hades"
            ? [
                {
                  catalogId: 1113,
                  title: "Hades",
                  genres: ["Roguelike"],
                  platforms: ["PC"],
                },
              ]
            : [],
      }),
    );
  });
  const execute = vi.fn(async () => {});
  render(createElement(BulkLink, { state, request, execute, onDone: vi.fn() }));
  fireEvent.click(screen.getByRole("button", { name: /Buscar coincidencias/ }));
  await act(() => vi.advanceTimersByTimeAsync(4000 * state.games.length));
  expect(request).toHaveBeenCalledTimes(state.games.length);
  expect(screen.getByText("Coincidencia exacta")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Vincular 1 juego" }));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(execute).toHaveBeenCalledWith({
    type: "link-catalog",
    items: [
      {
        gameId: state.games.find((g) => g.title === "Hades")!.id,
        catalogId: 1113,
        genres: ["Roguelike"],
      },
    ],
  });
});
