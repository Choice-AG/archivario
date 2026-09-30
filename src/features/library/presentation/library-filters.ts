"use client";
import { useMemo, useState } from "react";
import type { Game, Library, Run } from "../domain/model";
import { estimatedHours, matchesGame, type TimeMode } from "../domain/daily";
import { sortGames, type GameSort } from "../domain/insights";

export type LibraryFilters = {
  status: string;
  query: string;
  platform: string;
  genre: string;
  duration: string;
  timeMode: TimeMode;
  searchSpoilers: boolean;
  ownership: string;
  ratingFilter: string;
  sort: GameSort;
};
export const defaultFilters: LibraryFilters = {
  status: "Todos",
  query: "",
  platform: "Todas",
  genre: "Todos",
  duration: "Cualquiera",
  timeMode: "main",
  searchSpoilers: false,
  ownership: "owned",
  ratingFilter: "all",
  sort: "recent",
};

// Filtros del panel que difieren del valor por defecto (sin búsqueda, estado ni orden).
export function countActiveFilters(f: LibraryFilters) {
  return (
    [
      "platform",
      "genre",
      "duration",
      "timeMode",
      "ownership",
      "ratingFilter",
      "searchSpoilers",
    ] as const
  ).filter((key) => f[key] !== defaultFilters[key]).length;
}

export function useLibraryFilters() {
  const [filters, setFilters] = useState(defaultFilters),
    [page, setPage] = useState(1);
  // Cualquier cambio de filtro vuelve a la primera página.
  const set = <K extends keyof LibraryFilters>(
    key: K,
    value: LibraryFilters[K],
  ) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const reset = (overrides: Partial<LibraryFilters> = {}) => {
    setFilters({ ...defaultFilters, ...overrides });
    setPage(1);
  };
  return { filters, set, reset, page, setPage };
}

function inDuration(hours: number | undefined, duration: string) {
  if (duration === "Cualquiera") return true;
  if (hours === undefined) return false;
  if (duration === "short") return hours <= 10;
  if (duration === "medium") return hours > 10 && hours <= 30;
  return hours > 30;
}

export function useFilteredGames(
  state: Library,
  filters: LibraryFilters,
  view: string,
) {
  const runs = useMemo(
    () => new Map(state.runs.map((r) => [r.id, r])),
    [state.runs],
  );
  const filtered = useMemo(() => {
    const f = filters;
    return sortGames(
      state.games.filter((g) => {
        const run = runs.get(g.primaryRunId);
        if (!run) return false;
        return (
          (f.status === "Todos" || run.status === f.status) &&
          (f.platform === "Todas" || g.platforms.includes(f.platform)) &&
          (f.genre === "Todos" || g.genres.includes(f.genre)) &&
          inDuration(estimatedHours(g, f.timeMode), f.duration) &&
          (view !== "Favoritos" || g.favorite) &&
          (view !== "Próximos" || g.next || run.status === "pendiente") &&
          (f.ownership === "all" ||
            (f.ownership === "wishlist" ? g.wishlist : !g.wishlist)) &&
          (f.ratingFilter === "all" ||
            (f.ratingFilter === "unrated"
              ? g.rating === undefined
              : !g.review.trim())) &&
          matchesGame(state, g, f.query, f.searchSpoilers)
        );
      }),
      state,
      f.sort,
      f.timeMode,
    );
  }, [state, filters, view, runs]);
  const runOf = (g: Game): Run | undefined => runs.get(g.primaryRunId);
  return { filtered, runOf };
}
