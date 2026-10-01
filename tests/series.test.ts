// @vitest-environment jsdom
import { createElement } from "react";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { SWRConfig } from "swr";
import { GameSeries } from "../src/features/library/presentation/game-series";
// Caché de SWR aislada por test para que no se compartan respuestas.
const isolated = (element: React.ReactElement) =>
  createElement(SWRConfig, { value: { provider: () => new Map() } }, element);
import { demoLibrary } from "../src/features/library/infrastructure/demo";
afterEach(cleanup);
it("separates release order without claiming narrative sequels and links owned games", async () => {
  const state = demoLibrary();
  state.games[0].catalogId = 99;
  const onGame = vi.fn();
  const request = vi.fn().mockResolvedValue({
    json: async () => ({
      names: ["Saga"],
      limited: false,
      items: [
        {
          id: 99,
          title: "Anterior",
          releaseDate: "2020-01-01",
          relation: "earlier",
        },
        {
          id: 100,
          title: "Posterior",
          releaseDate: "2025-01-01",
          relation: "later",
          url: "https://www.igdb.com/games/later",
        },
      ],
    }),
  });
  render(
    isolated(
      createElement(GameSeries, {
        catalogId: 1,
        request,
        demo: false,
        state,
        onGame,
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.getByText("Lanzamientos anteriores")).toBeTruthy(),
  );
  expect(screen.getByText("Lanzamientos posteriores")).toBeTruthy();
  expect(screen.getByText(/no implica una precuela narrativa/)).toBeTruthy();
  fireEvent.click(screen.getByText("Abrir mi ficha →"));
  expect(onGame).toHaveBeenCalledWith(state.games[0].id);
  fireEvent.click(screen.getByText("Ver ficha del juego →"));
  expect(onGame).toHaveBeenCalledWith("igdb-100");
});
it("shows missing data honestly and allows retry after failure", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(Error("Sin conexión"))
    .mockResolvedValue({
      json: async () => ({ names: [], items: [], limited: false }),
    });
  render(
    isolated(
      createElement(GameSeries, {
        catalogId: 1,
        request,
        demo: false,
        state: demoLibrary(),
        onGame: vi.fn(),
      }),
    ),
  );
  await waitFor(() => expect(screen.getByText("Reintentar saga")).toBeTruthy());
  fireEvent.click(screen.getByText("Reintentar saga"));
  await waitFor(() =>
    expect(
      screen.getByText(
        "IGDB no ofrece otros juegos relacionados para esta ficha.",
      ),
    ).toBeTruthy(),
  );
});
