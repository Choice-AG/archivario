// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  useCatalogSearch,
  type CatalogGame,
} from "../src/features/library/presentation/use-catalog-search";
import { preferredPlatforms } from "../src/features/library/presentation/catalog-data";
const game: CatalogGame = {
  catalogId: 1,
  title: "Hollow Knight",
  genres: [],
  platforms: ["PC (Microsoft Windows)"],
};
const response = (items: CatalogGame[]) =>
  ({ json: async () => ({ items }) }) as Response;
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("waits 200 ms after the last keystroke and ignores short queries", async () => {
  const request = vi.fn().mockResolvedValue(response([game]));
  const { result } = renderHook(() => useCatalogSearch(request, true));
  act(() => result.current.setQuery("H"));
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(request).not.toHaveBeenCalled();
  act(() => result.current.setQuery("Ho"));
  await act(() => vi.advanceTimersByTimeAsync(199));
  expect(request).not.toHaveBeenCalled();
  act(() => result.current.setQuery("Hollow"));
  await act(() => vi.advanceTimersByTimeAsync(199));
  expect(request).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toContain("q=Hollow&page=1");
  expect(result.current.results).toEqual([game]);
});
it("aborts and ignores stale responses even if the transport ignores cancellation", async () => {
  let finish!: (value: Response) => void;
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(response([game]));
  const { result } = renderHook(() => useCatalogSearch(request, true));
  act(() => result.current.setQuery("Old"));
  await act(() => vi.advanceTimersByTimeAsync(200));
  const signal = request.mock.calls[0][1].signal;
  act(() => result.current.setQuery("Hollow"));
  expect(signal.aborted).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(200));
  await act(async () => finish(response([{ ...game, title: "Old" }])));
  expect(result.current.results).toEqual([game]);
});
it("reuses cached results and cancels a pending search when disabled", async () => {
  const request = vi.fn().mockResolvedValue(response([game]));
  const { result, rerender } = renderHook(
    ({ enabled }) => useCatalogSearch(request, enabled),
    { initialProps: { enabled: true } },
  );
  act(() => result.current.setQuery("Hollow"));
  await act(() => vi.advanceTimersByTimeAsync(200));
  act(() => result.current.setQuery("Other"));
  act(() => result.current.setQuery("Hollow"));
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(request).toHaveBeenCalledTimes(1);
  expect(result.current.results).toEqual([game]);
  act(() => result.current.setQuery("Other"));
  rerender({ enabled: false });
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(request).toHaveBeenCalledTimes(1);
  expect(result.current.results).toEqual([]);
});
it("prefills a compatible familiar platform without claiming all supported platforms", () => {
  expect(
    preferredPlatforms(
      ["PC (Microsoft Windows)", "PlayStation 5"],
      ["PC", "PC"],
    ),
  ).toEqual(["PC"]);
  expect(
    preferredPlatforms(["PC (Microsoft Windows)", "PlayStation 5"], []),
  ).toEqual([]);
  expect(preferredPlatforms(["Nintendo Switch"], [])).toEqual(["Switch"]);
});
