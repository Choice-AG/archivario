"use client";
import { useRef } from "react";
import { Check, ChevronLeft, ChevronRight, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Game, Library } from "../domain/model";
import { Cover } from "./shared";
import { formatDate } from "./format";

// Lo que estás jugando, arriba de la biblioteca: dónde lo dejaste, cuándo
// jugaste por última vez y «He jugado hoy» a un toque. Debajo, lo aparcado.
export function NowPlaying({
  state,
  playedToday,
  busy,
  onGame,
  onToday,
  onResume,
}: {
  state: Library;
  playedToday: Set<string>;
  busy: boolean;
  onGame: (id: string) => void;
  onToday: (game: Game) => void;
  onResume: (game: Game) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const status = (g: Game) =>
    state.runs.find((r) => r.id === g.primaryRunId)?.status;
  const lastDay = new Map<string, string>();
  for (const a of state.activities)
    if ((lastDay.get(a.gameId) ?? "") < a.date) lastDay.set(a.gameId, a.date);
  const recent = (a: Game, b: Game) =>
    (lastDay.get(b.id) ?? b.updatedAt).localeCompare(
      lastDay.get(a.id) ?? a.updatedAt,
    );
  const playing = state.games
    .filter((g) => status(g) === "jugando")
    .sort(recent);
  const paused = state.games
    .filter((g) => status(g) === "en pausa")
    .sort(recent);
  if (!playing.length && !paused.length) return null;
  const scroll = (direction: number) =>
    track.current?.scrollBy({
      left: direction * track.current.clientWidth * 0.9,
      behavior: "smooth",
    });
  return (
    <section className="continue-section" aria-labelledby="now-playing-title">
      <div className="section-header">
        <h2 id="now-playing-title">Ahora jugando</h2>
        {playing.length > 1 && (
          <div className="carousel-arrows">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Anteriores"
              onClick={() => scroll(-1)}
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Siguientes"
              onClick={() => scroll(1)}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        )}
      </div>
      {playing.length ? (
        <div className="continue-grid" ref={track}>
          {playing.map((g) => {
            const run = state.runs.find((r) => r.id === g.primaryRunId)!;
            const last = lastDay.get(g.id);
            const today = playedToday.has(g.id);
            return (
              <article key={g.id}>
                {/* La portada repite el enlace del título: solo para el ratón. */}
                <button
                  className="continue-cover"
                  aria-hidden="true"
                  onClick={() => onGame(g.id)}
                  tabIndex={-1}
                >
                  <Cover game={g} />
                </button>
                <div>
                  <h3>
                    <button
                      className="game-title"
                      aria-label={"Continuar " + g.title}
                      onClick={() => onGame(g.id)}
                    >
                      {g.title}
                    </button>
                  </h3>
                  <p>
                    {run.whereLeft ||
                      "Abre la ficha para apuntar dónde lo dejas."}
                  </p>
                  <small className="continue-last">
                    {today
                      ? "Has jugado hoy"
                      : last
                        ? "Último día: " + formatDate(last)
                        : "Aún sin días registrados"}
                  </small>
                  <div className="form-actions">
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => onToday(g)}
                      aria-label={
                        (today ? "Registrado hoy: " : "He jugado hoy: ") +
                        g.title
                      }
                    >
                      {today ? <Check size={15} /> : <Plus size={15} />}{" "}
                      {today ? "Registrado hoy" : "He jugado hoy"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted">
          Nada en marcha ahora mismo. Retoma algo de lo que tienes en pausa o
          elige tu próxima aventura.
        </p>
      )}
      {paused.length > 0 && (
        <div className="paused-row">
          <h3>En pausa</h3>
          <ul>
            {paused.map((g) => (
              <li key={g.id}>
                <button className="text-link" onClick={() => onGame(g.id)}>
                  {g.title}
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  aria-label={"Retomar " + g.title}
                  onClick={() => onResume(g)}
                >
                  <Play size={13} /> Retomar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
