"use client";
import { useEffect, useState } from "react";
import type { ApiRequest } from "./app";
import type { Library } from "../domain/model";
export type SeriesData = {
  names: string[];
  limited: boolean;
  items: {
    id: number;
    title: string;
    releaseDate: string;
    relation: string;
    cover?: string;
    url?: string;
  }[];
};
export function GameSeries({
  catalogId,
  request,
  demo,
  state,
  onGame,
}: {
  catalogId?: number;
  request: ApiRequest;
  demo: boolean;
  state: Library;
  onGame: (id: string) => void;
}) {
  const [data, setData] = useState<SeriesData>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!catalogId || demo) return;
    const c = new AbortController();
    let active = true;
    setData(undefined);
    setError("");
    request("/api/catalog/series?id=" + catalogId, { signal: c.signal })
      .then((r) => r.json())
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [catalogId, request, demo, retry]);
  if (!catalogId)
    return (
      <p className="muted">
        Vincula un juego del catálogo para consultar su saga. Esta ficha se
        añadió manualmente.
      </p>
    );
  if (demo)
    return (
      <p className="muted">
        Las sagas de IGDB están disponibles al iniciar sesión.
      </p>
    );
  if (error)
    return (
      <p role="alert">
        {error}{" "}
        <button className="text-link" onClick={() => setRetry((n) => n + 1)}>
          Reintentar saga
        </button>
      </p>
    );
  if (!data) return <p role="status">Consultando juegos de la saga…</p>;
  return (
    <>
      <p className="muted">
        {data.names.join(" · ") || "Sin saga identificada en IGDB"}
      </p>
      <p className="muted text-xs mt-3">
        Ordenados por fecha de lanzamiento. Un juego anterior no implica una
        precuela narrativa, ni uno posterior una secuela directa.
      </p>
      {!data.items.length && (
        <p className="info-note">
          IGDB no ofrece otros juegos relacionados para esta ficha.
        </p>
      )}
      {[
        ["earlier", "Lanzamientos anteriores"],
        ["later", "Lanzamientos posteriores"],
        ["same", "Misma fecha de lanzamiento"],
        ["unknown", "Sin orden confirmado"],
      ].map(([relation, label]) => {
        const games = data.items.filter((g) => g.relation === relation);
        return games.length ? (
          <div className="series-group" key={relation}>
            <h3>{label}</h3>
            <div className="series-grid">
              {games.map((g) => {
                const owned = state.games.find((x) => x.catalogId === g.id);
                return (
                  <article className="series-card" key={g.id}>
                    {g.cover && <img src={g.cover} alt="" loading="lazy" />}
                    <div>
                      <h4>{g.title}</h4>
                      <p>
                        {g.releaseDate
                          ? new Intl.DateTimeFormat("es", {
                              dateStyle: "medium",
                              timeZone: "UTC",
                            }).format(new Date(g.releaseDate))
                          : "Fecha no disponible"}
                      </p>
                      <button
                        className="text-link"
                        onClick={() => onGame(owned?.id ?? "igdb-" + g.id)}
                      >
                        {owned ? "Abrir mi ficha" : "Ver ficha del juego"} →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null;
      })}
      {data.limited && (
        <p className="muted text-xs">
          Se muestran hasta 100 juegos de las colecciones relacionadas.
        </p>
      )}
    </>
  );
}
