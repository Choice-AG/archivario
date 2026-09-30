"use client";
import { useEffect, useState } from "react";
import type { ApiRequest } from "./shared";
import { fetchCatalogDetails } from "./catalog-details-cache";
type Details = {
  summary: string;
  releaseDate: string;
  developers: string[];
  videos: { name: string; url: string }[];
};
export function CatalogDetails({
  catalogId,
  request,
  demo,
}: {
  catalogId?: number;
  request: ApiRequest;
  demo: boolean;
}) {
  const [data, setData] = useState<Details>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!catalogId || demo) return;
    let active = true;
    setError("");
    setData(undefined);
    fetchCatalogDetails(request, catalogId)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [catalogId, demo, request, retry]);
  if (!catalogId)
    return (
      <p className="info-note">
        Este juego se añadió manualmente y no tiene una ficha de IGDB asociada.
      </p>
    );
  if (demo)
    return (
      <p className="info-note">
        Inicia sesión para consultar los detalles de IGDB.
      </p>
    );
  if (error)
    return (
      <div role="alert">
        {error}
        <button className="text-link" onClick={() => setRetry((n) => n + 1)}>
          Reintentar
        </button>
      </div>
    );
  if (!data) return <p role="status">Cargando ficha de IGDB…</p>;
  return (
    <section className="catalog-details">
      <p className="muted text-xs">
        Información de IGDB; puede estar en inglés.
      </p>
      <h3>Sinopsis</h3>
      <p>{data.summary || "Sin sinopsis disponible."}</p>
      <h3>Primer lanzamiento</h3>
      <p>
        {data.releaseDate
          ? new Intl.DateTimeFormat("es", {
              dateStyle: "long",
              timeZone: "UTC",
            }).format(new Date(data.releaseDate))
          : "Sin fecha disponible"}
      </p>
      <h3>Estudio</h3>
      <p>{data.developers.join(" · ") || "Sin información disponible"}</p>
      <h3>Tráilers y vídeos</h3>
      {data.videos.length ? (
        data.videos.map((v) => (
          <p key={v.url}>
            <a href={v.url} target="_blank" rel="noopener noreferrer">
              {v.name} ↗
            </a>
          </p>
        ))
      ) : (
        <p>Sin vídeos disponibles.</p>
      )}
    </section>
  );
}
