"use client";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Command, Game, Library } from "../domain/model";
import { Cover, Modal } from "./shared";

const colors = ["#f5b942", "#b49cfa", "#5fc79a", "#f07aa6", "#6fb3f2"];

// Juego que el comando acaba de completar, si pasa a «completado» ahora.
export function completedBy(state: Library, c: Command) {
  if (c.type === "save-run" && c.run.status === "completado") {
    const before = state.runs.find((r) => r.id === c.run.id);
    return before?.status === "completado" ? undefined : c.run.gameId;
  }
  if (
    c.type === "batch-status" &&
    c.status === "completado" &&
    c.gameIds.length === 1
  ) {
    const game = state.games.find((g) => g.id === c.gameIds[0]);
    const run = state.runs.find((r) => r.id === game?.primaryRunId);
    return run && run.status !== "completado" ? game!.id : undefined;
  }
  return undefined;
}

// Un pequeño momento al terminar un juego, con la invitación a la reseña.
export function Celebration({
  game,
  onReview,
  onClose,
}: {
  game: Game;
  onReview: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={"¡Has completado " + game.title + "!"}
      description="Una aventura más en tu archivo."
      onClose={onClose}
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
        <p>
          {game.review
            ? "Ya tienes una reseña. ¿Quieres repasarla ahora que lo has terminado?"
            : "¿Quieres escribir tu reseña ahora que lo tienes fresco?"}
        </p>
      </div>
      <div className="form-actions">
        <Button onClick={onReview}>
          <PenLine size={16} />{" "}
          {game.review ? "Repasar mi reseña" : "Escribir la reseña"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Ahora no
        </Button>
      </div>
    </Modal>
  );
}
