"use client";
import type { ApiRequest } from "./shared";
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
// Varias secciones de una ficha comparten la misma petición de detalles.
const cache = new Map<number, Promise<CatalogDetailsData>>();
export function fetchCatalogDetails(request: ApiRequest, id: number) {
  let promise = cache.get(id);
  if (!promise) {
    promise = request("/api/catalog/details?id=" + id).then((r) => r.json());
    promise.catch(() => cache.delete(id));
    cache.set(id, promise);
    if (cache.size > 50) cache.delete(cache.keys().next().value!);
  }
  return promise;
}
