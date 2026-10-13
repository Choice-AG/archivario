"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Library } from "../domain/model";
import { sessionToLog } from "../domain/session";
import { DurationInput } from "./duration-input";
import { formatDate } from "./format";
import type { Execute } from "./shared";

// Al parar: se revisa el tiempo y se apunta en el diario del día que empezó.
export function StopSession({
  state,
  stoppedAt,
  execute,
  onClose,
}: {
  state: Library;
  stoppedAt: number;
  execute: Execute;
  onClose: () => void;
}) {
  const timer = state.profile.timer;
  const proposal = timer
    ? sessionToLog(timer, stoppedAt, state.profile.timezone)
    : undefined;
  const [minutes, setMinutes] = useState(proposal?.minutes),
    [date, setDate] = useState(proposal?.date ?? ""),
    [note, setNote] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const game = timer && state.games.find((g) => g.id === timer.gameId);
  if (!timer || !game || !proposal)
    return <p className="info-note">No hay ninguna sesión en marcha.</p>;
  const existing = state.activities.find(
    (a) => a.gameId === game.id && a.date === date,
  );
  const act = async (command: Parameters<Execute>[0]) => {
    setPending(true);
    setError("");
    try {
      await execute(command);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  };
  return (
    <form
      className="stop-session"
      onSubmit={(e) => {
        e.preventDefault();
        if (!minutes) return;
        act({
          type: "log-session",
          gameId: game.id,
          runId: timer.runId,
          date,
          minutes,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      }}
    >
      <p className="stop-session-game">
        <strong>{game.title}</strong> · desde el {formatDate(proposal.date)}
      </p>
      {proposal.forgotten && (
        <p className="info-note" role="status">
          El cronómetro lleva más de 12 horas en marcha. Ajusta el tiempo a lo
          que jugaste de verdad.
        </p>
      )}
      <DurationInput
        label="Tiempo de la sesión"
        required
        value={minutes}
        onChange={setMinutes}
        disabled={pending}
      />
      <label>
        Día
        <input
          type="date"
          value={date}
          required
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
      </label>
      {existing?.minutes ? (
        <p className="muted text-sm">Se suma a lo que ya tenías ese día.</p>
      ) : null}
      <label>
        Algo para recordar <small>Opcional · privado</small>
        <textarea
          rows={3}
          maxLength={1000}
          value={note}
          placeholder="Hoy he descubierto…"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={pending || !minutes}>Guardar en el diario</Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Seguir jugando
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => act({ type: "timer" })}
        >
          Descartar la sesión
        </Button>
      </div>
    </form>
  );
}
