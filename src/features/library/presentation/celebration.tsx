"use client";
import { useState } from "react";
import { PenLine, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Command, Library, Run } from "../domain/model";
import { estimatedHours, formatHours } from "../domain/daily";
import { Cover, Modal, type Execute } from "./shared";
import { RatingInput } from "./rating-input";
import { formatDate, plural } from "./format";

const colors = ["#f5b942", "#b49cfa", "#5fc79a", "#f07aa6", "#6fb3f2"];

export type Completion = { gameId: string; before: Run };

// Partida que el comando acaba de completar (y cómo estaba antes), si pasa a
// «completado» ahora. Con varios juegos a la vez no se celebra.
export function completedBy(
  state: Library,
  c: Command,
): Completion | undefined {
  const runId =
    c.type === "save-run" && c.run.status === "completado"
      ? c.run.id
      : c.type === "batch-status" &&
          c.status === "completado" &&
          c.gameIds.length === 1
        ? state.games.find((g) => g.id === c.gameIds[0])?.primaryRunId
        : undefined;
  const before = state.runs.find((r) => r.id === runId);
  return before && before.status !== "completado"
    ? { gameId: before.gameId, before }
    : undefined;
}

// Un pequeño momento al terminar un juego: el resumen del viaje, la nota y
// la invitación a la reseña. Todo se puede ajustar o deshacer desde aquí.
export function Celebration({
  state,
  completion,
  today,
  execute,
  onReview,
  onClose,
}: {
  state: Library;
  completion: Completion;
  today: string;
  execute: Execute;
  onReview: () => void;
  onClose: () => void;
}) {
  const [mute, setMute] = useState(false),
    [error, setError] = useState("");
  const game = state.games.find((g) => g.id === completion.gameId);
  const run = state.runs.find((r) => r.id === completion.before.id);
  if (!game || !run) return null;
  const days = new Set(
    state.activities.filter((a) => a.gameId === game.id).map((a) => a.date),
  ).size;
  const hours = estimatedHours(game, "main");
  const act = (command: Command) =>
    execute(command).catch((e: Error) => setError(e.message));
  const close = (then?: () => void) => {
    if (mute)
      act({
        type: "profile",
        profile: { ...state.profile, celebrate: false },
      });
    (then ?? onClose)();
  };
  return (
    <Modal
      title={"¡Has completado " + game.title + "!"}
      description="Una aventura más en tu archivo."
      onClose={() => close()}
    >
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            style={{
              left: ((i * 37) % 100) + "%",
              background: colors[i % colors.length],
              animationDelay: ((i * 53) % 700) + "ms",
              animationDuration: 1400 + ((i * 97) % 900) + "ms",
              transform: "rotate(" + ((i * 47) % 180) + "deg)",
            }}
          />
        ))}
      </div>
      <div className="celebration-body">
        <span className="celebration-cover">
          <Cover game={game} />
        </span>
        <dl className="celebration-trip">
          <div>
            <dt>Lo empezaste</dt>
            <dd>{formatDate(run.startedOn)}</dd>
          </div>
          {days > 0 && (
            <div>
              <dt>Días jugados</dt>
              <dd>{plural(days, "día", "días")}</dd>
            </div>
          )}
          {hours !== undefined && (
            <div>
              <dt>Duración estimada</dt>
              <dd>{formatHours(hours)}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="celebration-fields">
        <label>
          Lo terminaste el
          <input
            type="date"
            value={run.completedOn ?? today}
            min={run.startedOn}
            max={today}
            onChange={(e) =>
              e.target.value &&
              act({
                type: "save-run",
                primary: run.id === game.primaryRunId,
                run: { ...run, completedOn: e.target.value },
              })
            }
          />
        </label>
        <div className="rating-field">
          <span className="rating-label">¿Qué nota le das?</span>
          <RatingInput
            label="Tu valoración"
            value={game.rating}
            size={20}
            onChange={(rating) =>
              act({ type: "save-game", game: { ...game, rating } })
            }
          />
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button onClick={() => close(onReview)}>
          <PenLine size={16} />{" "}
          {game.review ? "Repasar mi reseña" : "Escribir la reseña"}
        </Button>
        <Button variant="ghost" onClick={() => close()}>
          Ahora no
        </Button>
        <Button
          variant="ghost"
          className="celebration-undo"
          onClick={() =>
            act({
              type: "save-run",
              primary: run.id === game.primaryRunId,
              run: completion.before,
            }).then(onClose)
          }
        >
          <Undo2 size={15} /> No, aún no lo he terminado
        </Button>
      </div>
      <label className="checkbox-label celebration-mute">
        <input
          type="checkbox"
          checked={mute}
          onChange={(e) => setMute(e.target.checked)}
        />{" "}
        No volver a mostrar esta celebración
      </label>
    </Modal>
  );
}
