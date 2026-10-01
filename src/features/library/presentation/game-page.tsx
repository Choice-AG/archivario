"use client";
import { DateText, statusLabel } from "./format";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  Heart,
  Link2,
  Pencil,
  Plus,
  Star,
} from "lucide-react";
import { StatusMenu } from "./status-menu";
import { GameGallery } from "./game-gallery";
import { Button } from "@/components/ui/button";
import { Cover, Modal, type ApiRequest, type Execute } from "./shared";
import { GameDetails } from "./forms";
import { GameSeries } from "./game-series";
import { CatalogDetails } from "./catalog-details";
import { LinkCatalog } from "./link-catalog";
import { useCatalogDetails, useCatalogTimes } from "./use-api";
import { CriticScore } from "./critic-score";
import { Markdown } from "./markdown";
import { formatHours, timeLabels, changeRunStatus } from "../domain/daily";
import { activityId, type Game, type Library } from "../domain/model";

const tabIds = ["resumen", "partidas", "resena", "diario", "juego"] as const;
type Tab = (typeof tabIds)[number];

// La pestaña vive en el fragmento de la URL (#partidas…): se puede enlazar y
// el botón Atrás del navegador vuelve a la anterior.
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
function useHashTab(): [Tab, (tab: Tab) => void] {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab = (tabIds as readonly string[]).includes(hash)
    ? (hash as Tab)
    : "resumen";
  return [
    tab,
    (next) => {
      if (next !== tab) window.location.hash = next;
    },
  ];
}

export function GamePage({
  game,
  state,
  request,
  execute,
  demo,
  today,
  onBack,
  onActivity,
  onJournal,
  onCritic,
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
  onJournal: () => void;
  onCritic?: (critic: { score: number; count: number }) => void;
}) {
  const [editor, setEditor] = useState<string>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [tab, setTab] = useHashTab();
  const linked = !!game.catalogId;
  const run = state.runs.find((r) => r.id === game.primaryRunId)!,
    runs = state.runs.filter((r) => r.gameId === game.id),
    activities = state.activities
      .filter((a) => a.gameId === game.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  const timesQuery = useCatalogTimes(request, game.catalogId, !demo);
  const details = useCatalogDetails(request, game.catalogId, !demo);
  const critic = details.data?.critic ?? game.critic;
  // Guarda la nota más reciente de IGDB para usarla en tarjetas y orden.
  const latest = details.data?.critic;
  useEffect(() => {
    if (latest) onCritic?.(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.score, latest?.count]);
  const playedToday = state.activities.find(
    (a) => a.gameId === game.id && a.date === today,
  );
  const [todayNote, setTodayNote] = useState(playedToday?.note ?? ""),
    [noteOpen, setNoteOpen] = useState(false);
  const [whereDraft, setWhereDraft] = useState<string>();
  const remoteTimes = timesQuery.data,
    loading = timesQuery.loading,
    timeError = timesQuery.error;
  const times = (["main", "extras", "complete"] as const).flatMap((mode) => {
    const item = game.times?.[mode] ?? remoteTimes?.[mode];
    const hours =
      item?.hours ?? (mode === "main" ? game.approximateHours : undefined);
    return hours === undefined
      ? []
      : [
          {
            mode,
            hours,
            source:
              !item || item.source === "manual" ? "Tu estimación" : "IGDB",
          },
        ];
  });
  const mutate = async (command: Parameters<Execute>[0]) => {
    setBusy(true);
    setError("");
    try {
      await execute(command);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "partidas", label: "Partidas", count: runs.length },
    { id: "resena", label: "Reseña" },
    { id: "diario", label: "Diario", count: activities.length },
    { id: "juego", label: "Sobre el juego" },
  ];
  const meta = [
    ...game.genres,
    ...game.platforms,
    ...game.stores,
    ...(game.wishlist ? ["En tu lista de deseos"] : []),
    ...(game.next ? ["Entre tus próximos"] : []),
  ];
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
          <div className="game-title-row">
            <h1 tabIndex={-1}>{game.title}</h1>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-pressed={game.favorite}
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
              <Heart size={20} fill={game.favorite ? "currentColor" : "none"} />
            </Button>
          </div>
          <p className="game-hero-meta">
            {meta.join(" · ") || "Tu próxima aventura"}
          </p>
          <div className="game-hero-score">
            <span className="my-score">
              <Star size={17} aria-hidden="true" />
              <strong>
                {game.rating
                  ? game.rating.toLocaleString("es") + "/10"
                  : "Sin valorar"}
              </strong>
              <span>Tu valoración</span>
            </span>
            <CriticScore critic={critic} />
            <StatusMenu
              label="Estado de la partida principal"
              status={run.status}
              disabled={busy}
              onChange={(status) =>
                mutate({
                  type: "save-run",
                  run: changeRunStatus(run, status, today),
                  primary: true,
                })
              }
            />
          </div>
          <div className="game-hero-actions">
            {playedToday ? (
              <span className="played-today" role="status">
                <Check size={16} /> Jugado hoy
              </span>
            ) : (
              <Button
                disabled={busy}
                onClick={() =>
                  mutate({
                    type: "save-activity",
                    activity: {
                      id: activityId(game.id, today),
                      gameId: game.id,
                      runId: game.primaryRunId,
                      date: today,
                      note: "",
                    },
                  })
                }
              >
                <Plus size={16} /> He jugado hoy
              </Button>
            )}
            <Button variant="secondary" onClick={onActivity}>
              <CalendarPlus size={16} /> Otro día
            </Button>
            <Button variant="secondary" onClick={() => setEditor("Ficha")}>
              <Pencil size={16} /> Editar juego
            </Button>
          </div>
          {playedToday &&
            (noteOpen ? (
              <form
                className="today-note"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await mutate({
                      type: "save-activity",
                      activity: { ...playedToday, note: todayNote.trim() },
                    })
                  )
                    setNoteOpen(false);
                }}
              >
                <label>
                  Una nota rápida de hoy <small>Opcional</small>
                  <input
                    autoFocus
                    value={todayNote}
                    maxLength={1000}
                    placeholder="¿Qué ha pasado en esta sesión?"
                    onChange={(e) => setTodayNote(e.target.value)}
                  />
                </label>
                <Button
                  variant="secondary"
                  disabled={busy || todayNote.trim() === playedToday.note}
                >
                  Guardar nota
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setTodayNote(playedToday.note);
                    setNoteOpen(false);
                  }}
                >
                  Cancelar
                </Button>
              </form>
            ) : (
              <p className="today-note-line">
                {playedToday.note && (
                  <span>
                    Hoy: <q>{playedToday.note}</q>
                  </span>
                )}
                <button className="text-link" onClick={() => setNoteOpen(true)}>
                  {playedToday.note ? (
                    <>
                      <Pencil size={13} /> Editar la nota de hoy
                    </>
                  ) : (
                    <>
                      <Plus size={13} /> Añadir una nota de hoy
                    </>
                  )}
                </button>
              </p>
            ))}
          {!linked && !demo && (
            <button
              className="text-link game-hero-link"
              onClick={() => setTab("juego")}
            >
              <Link2 size={14} /> Completar la ficha con IGDB
            </button>
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div
        className="game-tabs"
        role="tablist"
        aria-label="Secciones de la ficha"
        onKeyDown={(e) => {
          const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          const i = tabIds.indexOf(tab);
          const next = tabIds[(i + step + tabIds.length) % tabIds.length];
          setTab(next);
          document.getElementById("tab-" + next)?.focus();
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            id={"tab-" + t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={"panel-" + t.id}
            tabIndex={tab === t.id ? 0 : -1}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {!!t.count && <small>{t.count}</small>}
          </button>
        ))}
      </div>
      <div
        className="game-tab-panel"
        role="tabpanel"
        id={"panel-" + tab}
        aria-labelledby={"tab-" + tab}
      >
        {tab === "resumen" && (
          <section className="game-section game-summary">
            <div className="summary-row">
              <h2>
                {run.status === "completado" ? "Completado" : "Dónde lo dejé"}
              </h2>
              {whereDraft !== undefined ? (
                <form
                  className="where-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await mutate({
                        type: "save-run",
                        primary: true,
                        run: { ...run, whereLeft: whereDraft.trim() },
                      })
                    )
                      setWhereDraft(undefined);
                  }}
                >
                  <label>
                    <span className="sr-only">Dónde lo dejé</span>
                    <textarea
                      autoFocus
                      rows={2}
                      maxLength={5000}
                      value={whereDraft}
                      placeholder="Una pista para cuando vuelvas"
                      onChange={(e) => setWhereDraft(e.target.value)}
                    />
                  </label>
                  <div className="form-actions">
                    <Button size="sm" disabled={busy}>
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => setWhereDraft(undefined)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="game-prose">
                    {run.status === "completado" && run.completedOn ? (
                      <>
                        El <DateText date={run.completedOn} />
                        {run.whereLeft ? ". " + run.whereLeft : "."}
                      </>
                    ) : (
                      run.whereLeft || "Guarda una pista para cuando vuelvas."
                    )}
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setWhereDraft(run.whereLeft)}
                  >
                    <Pencil size={13} /> Editar dónde lo dejé
                  </button>
                </>
              )}
            </div>
            <div className="summary-row">
              <h2>Duración</h2>
              {times.length ? (
                <ul className="time-chips">
                  {times.map((t) => (
                    <li key={t.mode} title={t.source}>
                      <span>{timeLabels[t.mode]}</span>
                      <strong>{formatHours(t.hours)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  {loading ? "Consultando IGDB…" : "Sin datos de duración."}
                </p>
              )}
              {timeError && (
                <p className="muted" role="status">
                  {timeError}{" "}
                  <button className="text-link" onClick={timesQuery.retry}>
                    Reintentar consulta
                  </button>
                </p>
              )}
              <button
                className="text-link"
                onClick={() => setEditor("Tiempos")}
              >
                Ajustar estimaciones
              </button>
            </div>
            <div className="summary-row">
              <h2>Últimos días</h2>
              {activities.length ? (
                <ul className="summary-days">
                  {activities.slice(0, 3).map((a) => (
                    <li key={a.id}>
                      <DateText date={a.date} />
                      <span>{a.note || "Un día de juego"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Tu primer día de juego aparecerá aquí.</p>
              )}
              {activities.length > 0 && (
                <button className="text-link" onClick={() => setTab("diario")}>
                  {activities.length > 3
                    ? "Ver los " + activities.length + " días"
                    : "Ver en el diario del juego"}
                </button>
              )}
            </div>
            <div className="summary-row">
              <h2>Tu reseña</h2>
              {game.review ? (
                <Markdown className="game-prose clamp" text={game.review} />
              ) : (
                <p className="muted">Todavía no has escrito una reseña.</p>
              )}
              <button className="text-link" onClick={() => setTab("resena")}>
                {game.review ? "Leer la reseña" : "Escribir la reseña"}
              </button>
            </div>
          </section>
        )}
        {tab === "partidas" && (
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
                    {r.platform} · {statusLabel(r.status)}
                    {r.id === game.primaryRunId ? " · Principal" : ""}
                  </p>
                </div>
                <dl>
                  <div>
                    <dt>Comienzo</dt>
                    <dd>
                      <DateText date={r.startedOn} />
                    </dd>
                  </div>
                  {r.completedOn && (
                    <div>
                      <dt>Finalización</dt>
                      <dd>
                        <DateText date={r.completedOn} />
                      </dd>
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
                {r.whereLeft && r.status !== "completado" && (
                  <p className="run-where">Dónde lo dejé: {r.whereLeft}</p>
                )}
                {r.review && (
                  <Markdown className="game-prose" text={r.review} />
                )}
              </article>
            ))}
          </section>
        )}
        {tab === "resena" && (
          <section className="game-section" id="game-notes">
            <div className="section-header">
              <h2>Mi reseña</h2>
              <button className="text-link" onClick={() => setEditor("Notas")}>
                Editar notas
              </button>
            </div>
            {game.review ? (
              <Markdown className="game-prose" text={game.review} />
            ) : (
              <p className="game-prose">
                Todavía no has escrito una reseña. Guarda aquí lo que te ha
                hecho sentir este juego.
              </p>
            )}
            {game.spoilerNote && (
              <details className="spoiler">
                <summary>Mostrar notas con spoilers</summary>
                <Markdown className="game-prose" text={game.spoilerNote} />
              </details>
            )}
          </section>
        )}
        {tab === "diario" && (
          <section className="game-section" id="game-journal">
            <div className="section-header">
              <h2>Mi actividad</h2>
              <button className="text-link" onClick={onActivity}>
                Registrar un día
              </button>
            </div>
            {activities.length ? (
              activities.slice(0, 10).map((a) => (
                <div className="game-journal-row" key={a.id}>
                  <DateText date={a.date} />
                  <p>{a.note || "Un día de juego"}</p>
                </div>
              ))
            ) : (
              <p className="muted">Tu primer día de juego aparecerá aquí.</p>
            )}
            {activities.length > 0 && (
              <button className="text-link mt-4" onClick={onJournal}>
                Ver todos en el diario
              </button>
            )}
          </section>
        )}
        {tab === "juego" &&
          (linked ? (
            <>
              <GameGallery
                id={game.catalogId}
                cover={game.cover}
                request={request}
                demo={demo}
              />
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
            </>
          ) : (
            <LinkCatalog
              game={game}
              request={request}
              execute={execute}
              demo={demo}
            />
          ))}
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
          description={
            {
              Ficha: "Título, plataformas, tiendas y tu valoración.",
              Notas: "Tu reseña y las notas con spoilers, siempre privadas.",
              Partidas:
                "Cada partida o rejugada, con su estado y dónde lo dejaste.",
              Tiempos: "Cuánto dura el juego según IGDB o según tú.",
            }[editor]
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
