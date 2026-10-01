"use client";
import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { GameTabs, useHashTab } from "./tabs";
import { platformChoices } from "./catalog-data";
import { GameGallery } from "./game-gallery";
import { Button } from "@/components/ui/button";
import { Modal, type ApiRequest, type Execute } from "./shared";
import { AddGame } from "./add-game";
import { GameSeries } from "./game-series";
import { formatHours, timeLabels } from "../domain/daily";
import type { Library } from "../domain/model";
import type { CatalogGame } from "./use-catalog-search";
import { useSagaGuides } from "./saga-guides";
import { CriticScore } from "./critic-score";
import { useCatalogDetails, useCatalogTimes } from "./use-api";
const catalogTabs = ["resumen", "imagenes", "saga"] as const;
type Details = CatalogGame & {
  summary: string;
  releaseDate: string;
  developers: string[];
  videos: { name: string; url: string }[];
};
export function CatalogGamePage({
  id,
  state,
  request,
  execute,
  demo,
  onBack,
  backLabel = "Volver a Sagas",
  onGame,
}: {
  id: number;
  state: Library;
  request: ApiRequest;
  execute: Execute;
  demo: boolean;
  onBack: () => void;
  backLabel?: string;
  onGame: (id: string) => void;
}) {
  const guides = useSagaGuides();
  const entry = [...(state.sagas ?? []), ...(guides ?? [])]
    .flatMap((s) => s.entries)
    .find((e) => e.catalogId === id);
  const [adding, setAdding] = useState(false);
  const details = useCatalogDetails(request, id, !demo),
    timesQuery = useCatalogTimes(request, id, !demo);
  const data = details.data as Details | undefined,
    error = details.error,
    times = timesQuery.data,
    timeError = timesQuery.error;
  const game: CatalogGame | undefined = data
    ? {
        catalogId: id,
        title: data.title,
        genres: data.genres,
        platforms: data.platforms,
        ...(data.cover ? { cover: data.cover } : {}),
        ...(data.critic ? { critic: data.critic } : {}),
      }
    : entry
      ? {
          catalogId: id,
          title: entry.title,
          genres: [],
          platforms: [],
          ...(entry.cover ? { cover: entry.cover } : {}),
        }
      : undefined;
  const owned = state.games.find((g) => g.catalogId === id);
  const [tab, setTab] = useHashTab(catalogTabs);
  const year = (data?.releaseDate ?? entry?.releaseDate)?.slice(0, 4);
  const meta = game
    ? [
        ...game.genres,
        ...platformChoices(game.platforms),
        ...(year ? [year] : []),
      ]
    : [];
  const hours = (["main", "extras", "complete"] as const).flatMap((mode) =>
    times?.[mode] ? [{ mode, hours: times[mode].hours }] : [],
  );
  return (
    <div className="game-page">
      <button className="game-back" onClick={onBack}>
        <ArrowLeft size={16} /> {backLabel}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              details.retry();
              timesQuery.retry();
            }}
          >
            Reintentar ficha
          </button>
        </p>
      )}
      {game ? (
        <>
          <header className="game-hero">
            {/* El ambiente de la cabecera sale de la propia portada, difuminada. */}
            {game.cover && (
              <img
                className="game-hero-backdrop"
                src={game.cover}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="game-hero-cover">
              {game.cover && (
                <img src={game.cover} alt={"Portada de " + game.title} />
              )}
            </div>
            <div className="game-hero-info">
              <p className="eyebrow">EXPLORA EL CATÁLOGO</p>
              <div className="game-title-row">
                <h1 tabIndex={-1}>{game.title}</h1>
              </div>
              <p className="game-hero-meta">{meta.join(" · ")}</p>
              <div className="game-hero-score">
                <CriticScore critic={data?.critic} />
              </div>
              <div className="game-hero-actions">
                {owned ? (
                  <Button onClick={() => onGame(owned.id)}>
                    Abrir mi ficha
                  </Button>
                ) : (
                  <Button
                    disabled={!demo && !data}
                    onClick={() => setAdding(true)}
                  >
                    <Plus size={16} /> Añadir a mi biblioteca
                  </Button>
                )}
              </div>
            </div>
          </header>
          <GameTabs
            tabs={[
              { id: "resumen", label: "Resumen" },
              { id: "imagenes", label: "Imágenes" },
              { id: "saga", label: "Saga" },
            ]}
            active={tab}
            onSelect={setTab}
          />
          <div
            className="game-tab-panel"
            role="tabpanel"
            id={"panel-" + tab}
            aria-labelledby={"tab-" + tab}
          >
            {tab === "resumen" && (
              <section className="game-section" id="catalog-overview">
                <h2>Sobre el juego</h2>
                {demo ? (
                  <>
                    <p className="game-prose">{entry?.note}</p>
                    <p className="info-note">
                      Inicia sesión para consultar la sinopsis, la duración y el
                      estudio desde IGDB.
                    </p>
                  </>
                ) : data ? (
                  <>
                    <p className="game-prose">
                      {data.summary || "Sin sinopsis disponible."}
                    </p>
                    <p className="muted text-xs">
                      Información de IGDB; puede estar en inglés.
                    </p>
                    <dl className="catalog-facts">
                      <div>
                        <dt>Estudio</dt>
                        <dd>
                          {data.developers.join(" · ") ||
                            "Sin información disponible"}
                        </dd>
                      </div>
                      <div>
                        <dt>Primer lanzamiento</dt>
                        <dd>
                          {data.releaseDate
                            ? new Intl.DateTimeFormat("es", {
                                dateStyle: "long",
                                timeZone: "UTC",
                              }).format(new Date(data.releaseDate))
                            : "Sin fecha disponible"}
                        </dd>
                      </div>
                      <div>
                        <dt>Duración</dt>
                        <dd>
                          {hours.length ? (
                            <ul className="time-chips">
                              {hours.map((t) => (
                                <li key={t.mode}>
                                  <span>{timeLabels[t.mode]}</span>
                                  <strong>{formatHours(t.hours)}</strong>
                                </li>
                              ))}
                            </ul>
                          ) : timeError ? (
                            <>
                              {timeError}{" "}
                              <button
                                className="text-link"
                                onClick={() => timesQuery.retry()}
                              >
                                Reintentar
                              </button>
                            </>
                          ) : times ? (
                            "Sin datos de duración."
                          ) : (
                            "Consultando IGDB…"
                          )}
                        </dd>
                      </div>
                    </dl>
                    {data.videos.length > 0 && (
                      <>
                        <h3>Tráilers y vídeos</h3>
                        <ul className="catalog-videos">
                          {data.videos.map((v) => (
                            <li key={v.url}>
                              <a
                                className="text-link"
                                href={v.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {v.name} ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                ) : (
                  <p role="status">Cargando información…</p>
                )}
              </section>
            )}
            {tab === "imagenes" && (
              <GameGallery
                id={id}
                cover={game.cover}
                request={request}
                demo={demo}
              />
            )}
            {tab === "saga" && (
              <section className="game-section" id="catalog-series">
                <h2>Otros juegos de la saga</h2>
                <GameSeries
                  catalogId={id}
                  state={state}
                  request={request}
                  demo={demo}
                  onGame={onGame}
                />
              </section>
            )}
          </div>
          {adding && (
            <Modal
              title="Añadir a mi biblioteca"
              description="Revisa los datos del catálogo y elige plataforma y estado."
              onClose={() => setAdding(false)}
            >
              <AddGame
                initialGame={game}
                state={state}
                execute={execute}
                request={request}
                demo={demo}
                onClose={() => setAdding(false)}
                onAdded={onGame}
              />
            </Modal>
          )}
        </>
      ) : !error ? (
        <p role="status">
          {demo
            ? "Este título no está incluido en la demostración. Inicia sesión para consultar su ficha."
            : "Cargando ficha…"}
        </p>
      ) : null}
    </div>
  );
}
