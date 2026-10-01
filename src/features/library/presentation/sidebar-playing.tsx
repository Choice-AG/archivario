"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Pause, Play, Plus, Sparkles } from "lucide-react";
import { activityId, type Library } from "../domain/model";
import { Cover, type Execute } from "./shared";

const INTERVAL = 6000;
const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

// Carrusel del menú lateral con lo que estás jugando: va pasando solo, se
// detiene al pasar el ratón o con el teclado y tiene su botón de pausa.
// Sin juegos en marcha, vuelve el lema de siempre.
export function SidebarPlaying({
  state,
  today,
  execute,
  onGame,
}: {
  state: Library;
  today: string;
  execute: Execute;
  onGame: (id: string) => void;
}) {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reducedQuery).matches,
    () => true,
  );
  const games = state.games.filter((g) =>
    state.runs.some((r) => r.id === g.primaryRunId && r.status === "jugando"),
  );
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [hovered, setHovered] = useState(false),
    [busy, setBusy] = useState(false);
  const running = !reduced && !paused && !hovered && games.length > 1;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % games.length),
      INTERVAL,
    );
    return () => clearInterval(timer);
  }, [running, games.length]);

  if (!games.length)
    return (
      <div className="quiet-card">
        <span>
          Sin prisa.
          <br />
          Sin rachas ni fechas límite.
        </span>
        <p>Solo historias por vivir.</p>
        <Sparkles size={20} />
      </div>
    );

  const current = index % games.length;
  return (
    <section
      className="side-playing"
      aria-roledescription="carrusel"
      aria-label="Ahora jugando"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false);
      }}
    >
      <div className="side-playing-head">
        <span>Ahora jugando</span>
        {games.length > 1 && !reduced && (
          <button
            type="button"
            aria-label={paused ? "Reanudar el carrusel" : "Pausar el carrusel"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
        )}
      </div>
      <div
        className="side-playing-track"
        aria-live={running ? "off" : "polite"}
      >
        {games.map((g, i) => {
          const run = state.runs.find((r) => r.id === g.primaryRunId)!;
          const played = state.activities.some(
            (a) => a.gameId === g.id && a.date === today,
          );
          return (
            <div
              key={g.id}
              className="side-playing-slide"
              role="group"
              aria-roledescription="diapositiva"
              aria-label={i + 1 + " de " + games.length + ": " + g.title}
              hidden={i !== current}
            >
              <button
                className="side-playing-game"
                onClick={() => onGame(g.id)}
                aria-label={"Abrir la ficha de " + g.title}
              >
                <span className="side-playing-cover" aria-hidden="true">
                  <Cover game={g} />
                </span>
                <span className="side-playing-text">
                  <strong>{g.title}</strong>
                  <small>
                    {run.whereLeft || "Sin nota de dónde lo dejaste"}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="side-playing-today"
                disabled={busy || played}
                aria-label={
                  (played ? "Registrado hoy: " : "He jugado hoy: ") + g.title
                }
                onClick={async () => {
                  setBusy(true);
                  try {
                    await execute({
                      type: "save-activity",
                      activity: {
                        id: activityId(g.id, today),
                        gameId: g.id,
                        runId: g.primaryRunId,
                        date: today,
                        note: "",
                      },
                    });
                  } catch {
                    // El error ya aparece en el aviso global.
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {played ? <Check size={14} /> : <Plus size={14} />}
                {played ? "Registrado hoy" : "He jugado hoy"}
              </button>
            </div>
          );
        })}
      </div>
      {games.length > 1 && (
        <div className="side-playing-dots">
          {games.map((g, i) => (
            <button
              key={g.id}
              type="button"
              aria-label={"Ver " + g.title}
              aria-current={i === current ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
