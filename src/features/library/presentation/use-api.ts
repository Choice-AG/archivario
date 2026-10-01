"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { GameTimes, Saga } from "../domain/model";
import type { ApiRequest } from "./shared";
import type { SeriesData } from "./game-series";

export type CatalogDetailsData = {
  screenshots: string[];
  catalogId: number;
  title: string;
  cover: string | null;
  genres: string[];
  platforms: string[];
  summary: string;
  releaseDate: string;
  developers: string[];
  videos: { name: string; url: string }[];
};

// Los datos del catálogo son públicos y cambian poco: se comparten entre
// componentes, se piden una vez y no se recargan al volver a la pestaña.
const options = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  shouldRetryOnError: false,
  dedupingInterval: 10 * 60 * 1000,
};

export function useApi<T>(request: ApiRequest, path: string | null) {
  const swr = useSWR<T, Error>(
    path,
    (url: string) => request(url).then((r) => r.json() as Promise<T>),
    options,
  );
  return {
    data: swr.data,
    error: swr.error?.message ?? "",
    loading: !!path && swr.isLoading,
    retry: () => swr.mutate(),
  };
}

const id = (value?: number) => (value && value > 0 ? value : undefined);

export const useCatalogDetails = (
  request: ApiRequest,
  catalogId: number | undefined,
  enabled = true,
) =>
  useApi<CatalogDetailsData>(
    request,
    enabled && id(catalogId) ? "/api/catalog/details?id=" + catalogId : null,
  );

export const useCatalogTimes = (
  request: ApiRequest,
  catalogId: number | undefined,
  enabled = true,
) =>
  useApi<GameTimes>(
    request,
    enabled && id(catalogId) ? "/api/catalog/times?id=" + catalogId : null,
  );

export const useCatalogSeries = (
  request: ApiRequest,
  catalogId: number | undefined,
  enabled = true,
) =>
  useApi<SeriesData>(
    request,
    enabled && id(catalogId) ? "/api/catalog/series?id=" + catalogId : null,
  );

export const useSagaPreview = (
  request: ApiRequest,
  collectionId: number | undefined,
  enabled = true,
) =>
  useApi<Saga>(
    request,
    enabled && id(collectionId)
      ? "/api/catalog/sagas?id=" + collectionId
      : null,
  );

// Búsqueda de sagas con una pequeña espera tras dejar de escribir.
export function useSagaSearch(
  request: ApiRequest,
  query: string,
  enabled = true,
) {
  const [debounced, setDebounced] = useState("");
  const q = query.trim();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(timer);
  }, [q]);
  const valid = enabled && debounced.length >= 2 && debounced === q;
  const result = useApi<{ items: { id: number; name: string }[] }>(
    request,
    valid ? "/api/catalog/sagas?q=" + encodeURIComponent(debounced) : null,
  );
  return {
    items: valid ? (result.data?.items ?? []) : [],
    error: valid ? result.error : "",
    loading: enabled && q.length >= 2 && (debounced !== q || result.loading),
  };
}
