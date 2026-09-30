"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, Pencil, Plus, Star } from "lucide-react";
import { GameGallery } from "./game-gallery";
import { Button } from "@/components/ui/button";
import { Cover, Modal, type ApiRequest, type Execute } from "./app";
import { GameDetails } from "./forms";
import { GameSeries } from "./game-series";
import { CatalogDetails } from "./catalog-details";
import { formatHours, timeLabels, changeRunStatus } from "../domain/daily";
import {
  statuses,
  type Game,
  type GameTimes,
  type Library,
  type Run,
} from "../domain/model";
export function GamePage({
  game,
  state,
  request,
  execute,
  demo,
  today,
  onBack,
  onActivity,
  onGame,
}: {
  onGame: (id: string) => void;
  game: Game;
  state: Library;
  request: ApiRequest;
  execute: Execute;
  demo: boolean;
  today: string;
  onBack: () => void;
  onActivity: () => void;
}) {
  const [editor, setEditor] = useState<string>(),
    [remoteTimes, setRemoteTimes] = useState<GameTimes>(),
    [loading, setLoading] = useState(false),
    [timeError, setTimeError] = useState(""),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = state.runs.find((r) => r.id === game.primaryRunId)!,
    runs = state.runs.filter((r) => r.gameId === game.id),
    activities = state.activities
      .filter((a) => a.gameId === game.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  useEffect(() => {
    if (!game.catalogId || demo) return;
    const c = new AbortController();
    let active = true;
    setLoading(true);
    setTimeError("");
    request("/api/catalog/times?id=" + game.catalogId, { signal: c.signal })
      .then((r) => r.json())
      .then((data) => {
        if (active) setRemoteTimes(data);
      })
      .catch((e) => {
        if (active) setTimeError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [game.catalogId, demo, request, retry]);
  const mutate = async (command: Parameters<Execute>[0]) => {
    setBusy(true);
    setError("");
    try {
      await execute(command);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="game-page">
      <button className="game-back" onClick={onBack}>
        <ArrowLeft size={16} /> Volver a la biblioteca
      </button>
      <header className="game-hero">
        <div className="game-hero-cover">
          <Cover game={game} />
        </div>
        <div className="game-hero-info">
          <p className="eyebrow">
            {game.wishlist ? "EN TU LISTA DE DESEOS" : "TU BIBLIOTECA PERSONAL"}
          </p>
          <h1 tabIndex={-1}>{game.title}</h1>
          <p className="game-hero-genres">
            {game.genres.join(" · ") || "Tu próxima aventura"}
          </p>
          <div className="game-platforms">
            {game.platforms.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
          <div className="game-hero-score">
            <Star size={18} />
            <strong>
              {game.rating
                ? game.rating.toLocaleString("es") + "/10"
                : "Sin valorar"}
            </strong>
            <span>Tu valoración</span>
          </div>
          <div className="game-hero-actions">
            <Button onClick={onActivity}>
              <Plus size={16} /> Registrar actividad
            </Button>
            <Button variant="secondary" onClick={() => setEditor("Ficha")}>
              <Pencil size={16} /> Editar juego
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              aria-label={
                game.favorite ? "Quitar de favoritos" : "Añadir a favoritos"
              }
              onClick={() =>
                mutate({
                  type: "save-game",
                  game: { ...game, favorite: !game.favorite },
                })
              }
            >
              <Heart size={18} fill={game.favorite ? "currentColor" : "none"} />
            </Button>
          </div>
        </div>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <nav className="game-section-links" aria-label="Secciones de la ficha">
        {[
          ["game-overview", "Información"],
          ["game-times", "Duración"],
          ["game-series", "Saga"],
          ["game-runs", "Mis partidas"],
          ["game-notes", "Mi reseña"],
          ["game-journal", "Actividad"],
        ].map(([id, label]) => (
          <a key={id} href={"#" + id}>
            {label}
          </a>
        ))}
      </nav>
      <GameGallery
        id={game.catalogId}
        cover={game.cover}
        request={request}
        demo={demo}
      />
      <h2 className="section-label">Información del juego</h2>
      <div className="game-page-columns">
        <div className="game-page-content">
          <section className="game-section" id="game-times">
            <div className="section-header">
              <h2>¿Cuánto dura?</h2>
              <button
                className="text-link"
                onClick={() => setEditor("Tiempos")}
              >
                Ajustar estimaciones
              </button>
            </div>
            <p className="muted">Tiempos orientativos del juego completo.</p>
            <div className="game-time-cards">
              {(["main", "extras", "complete"] as const).map((mode) => {
                const item = game.times?.[mode] ?? remoteTimes?.[mode];
                return (
                  <div key={mode}>
                    <span>{timeLabels[mode]}</span>
                    <strong>
                      {item
                        ? formatHours(item.hours)
                        : mode === "main" && game.approximateHours !== undefined
                          ? formatHours(game.approximateHours)
                          : loading
                            ? "…"
                            : "Sin datos"}
                    </strong>
                    <small>
                      {item
                        ? "Fuente: " + item.source
                        : mode === "main" && game.approximateHours !== undefined
                          ? "Referencia manual anterior"
                          : loading
                            ? "Consultando IGDB"
                            : "No disponible"}
                    </small>
                  </div>
                );
              })}
            </div>
            {timeError && (
              <p className="muted" role="status">
                {timeError}{" "}
                <button
                  className="text-link"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Reintentar consulta
                </button>
              </p>
            )}
            {!demo && game.catalogId && (
              <p className="muted text-xs">
                Las estimaciones disponibles se consultan automáticamente en
                IGDB.
              </p>
            )}
          </section>
          <section className="game-section" id="game-overview">
            <h2>Sobre el juego</h2>
            <CatalogDetails
              catalogId={game.catalogId}
              request={request}
              demo={demo}
            />
          </section>
          <section className="game-section" id="game-series">
            <h2>Otros juegos de la saga</h2>
            <GameSeries
              catalogId={game.catalogId}
              request={request}
              demo={demo}
              state={state}
              onGame={onGame}
            />
          </section>
          <h2 className="section-label">Tus partidas y recuerdos</h2>
          <section className="game-section" id="game-runs">
            <div className="section-header">
              <h2>Mis partidas</h2>
              <button
                className="text-link"
                onClick={() => setEditor("Partidas")}
              >
                Gestionar partidas
              </button>
            </div>
            {runs.map((r) => (
              <article className="game-run-summary" key={r.id}>
                <div>
                  <h3>{r.label}</h3>
                  <p>
                    {r.platform} · {r.status}
                    {r.id === game.primaryRunId ? " · Principal" : ""}
                  </p>
                </div>
                <dl>
                  <div>
                    <dt>Comienzo</dt>
                    <dd>{r.startedOn}</dd>
                  </div>
                  {r.completedOn && (
                    <div>
                      <dt>Finalización</dt>
                      <dd>{r.completedOn}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Mi tiempo real</dt>
                    <dd>
                      {r.completionMinutes !== undefined
                        ? Math.floor(r.completionMinutes / 60) +
                          " h " +
                          (r.completionMinutes % 60) +
                          " min"
                        : "Sin registrar"}
                    </dd>
                  </div>
                  {r.rating && (
                    <div>
                      <dt>Mi nota</dt>
                      <dd>{r.rating}/10</dd>
                    </div>
                  )}
                </dl>
                {r.review && <p className="game-prose">{r.review}</p>}
              </article>
            ))}
          </section>
          <section className="game-section" id="game-notes">
            <div className="section-header">
              <h2>Mi reseña</h2>
              <button className="text-link" onClick={() => setEditor("Notas")}>
                Editar notas
              </button>
            </div>
            <p className="game-prose">
              {game.review ||
                "Todavía no has escrito una reseña. Guarda aquí lo que te ha hecho sentir este juego."}
            </p>
            {game.spoilerNote && (
              <details className="spoiler">
                <summary>Mostrar notas con spoilers</summary>
                <p className="game-prose">{game.spoilerNote}</p>
              </details>
            )}
          </section>
          <section className="game-section" id="game-journal">
            <div className="section-header">
              <h2>Mi actividad</h2>
              <button className="text-link" onClick={onActivity}>
                Registrar un día
              </button>
            </div>
            {activities.length ? (
              activities.slice(0, 20).map((a) => (
                <div className="game-journal-row" key={a.id}>
                  <time>{a.date}</time>
                  <p>{a.note || "Un día de juego"}</p>
                </div>
              ))
            ) : (
              <p className="muted">Tu primer día de juego aparecerá aquí.</p>
            )}
            {activities.length > 20 && (
              <p className="muted">Mostrando los 20 registros más recientes.</p>
            )}
          </section>
        </div>
        <aside className="game-personal">
          <section className="game-section">
            <p className="eyebrow">TU PARTIDA ACTUAL</p>
            <h2>¿Por dónde vas?</h2>
            <label>
              Estado de la partida
              <select
                value={run.status}
                disabled={busy}
                onChange={(e) =>
                  mutate({
                    type: "save-run",
                    primary: true,
                    run: changeRunStatus(
                      run,
                      e.target.value as Run["status"],
                      today,
                    ),
                  })
                }
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <h3>Dónde lo dejé</h3>
            <p className="game-prose">
              {run.whereLeft || "Guarda una pista para cuando vuelvas."}
            </p>
            <Button variant="secondary" onClick={() => setEditor("Partidas")}>
              Actualizar mi partida
            </Button>
          </section>
          <section className="game-section">
            <h2>En mi colección</h2>
            <p>
              {game.wishlist
                ? "En mi lista de deseos"
                : "Disponible en mi biblioteca"}
            </p>
            <p className="muted">
              {game.stores.join(" · ") || "Sin tienda registrada"}
            </p>
            <p>{game.next ? "Entre mis próximos tres" : ""}</p>
          </section>
        </aside>
      </div>
      {editor && (
        <Modal
          title={
            {
              Ficha: "Editar juego",
              Notas: "Editar notas",
              Partidas: "Gestionar partidas",
              Tiempos: "Ajustar estimaciones",
            }[editor] ?? editor
          }
          onClose={() => setEditor(undefined)}
        >
          <GameDetails
            initialSection={editor}
            game={game}
            state={state}
            execute={execute}
            request={request}
            demo={demo}
            onClose={() => {
              setEditor(undefined);
              onBack();
            }}
            onActivity={() => {
              setEditor(undefined);
              onActivity();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
