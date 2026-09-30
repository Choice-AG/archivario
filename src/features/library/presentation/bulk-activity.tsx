"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { activityId, type Library } from "../domain/model";
import type { Execute } from "./shared";
export function BulkActivity({
  state,
  today,
  execute,
  onClose,
}: {
  state: Library;
  today: string;
  execute: Execute;
  onClose: () => void;
}) {
  const [gameId, setGameId] = useState(state.games[0]?.id ?? ""),
    [runId, setRunId] = useState(state.games[0]?.primaryRunId ?? ""),
    [month, setMonth] = useState(today.slice(0, 7)),
    [dates, setDates] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const existing = dates.filter((date) =>
    state.activities.some((a) => a.id === activityId(gameId, date)),
  ).length;
  if (!state.games.length)
    return <p className="info-note">Añade un juego antes de registrar días.</p>;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
          await execute({ type: "add-activities", gameId, runId, dates, note });
          onClose();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={pending}>
        <label>
          Juego para varios días
          <select
            value={gameId}
            onChange={(e) => {
              setGameId(e.target.value);
              setRunId(
                state.games.find((g) => g.id === e.target.value)!.primaryRunId,
              );
            }}
          >
            {state.games.map((g) => (
              <option value={g.id} key={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Partida para varios días
          <select value={runId} onChange={(e) => setRunId(e.target.value)}>
            {state.runs
              .filter((r) => r.gameId === gameId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Mes para seleccionar días
          <input
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
        <div className="bulk-days">
          {Array.from(
            {
              length: new Date(
                Number(month.slice(0, 4)),
                Number(month.slice(5)),
                0,
              ).getDate(),
            },
            (_, i) => {
              const date = month + "-" + String(i + 1).padStart(2, "0");
              return (
                <button
                  type="button"
                  key={date}
                  aria-label={"Seleccionar " + date}
                  aria-pressed={dates.includes(date)}
                  onClick={() =>
                    setDates((ds) =>
                      ds.includes(date)
                        ? ds.filter((d) => d !== date)
                        : ds.length < 62
                          ? [...ds, date]
                          : ds,
                    )
                  }
                >
                  {i + 1}
                </button>
              );
            },
          )}
        </div>
        <p role="status">
          {dates.length} días seleccionados · {dates.length - existing} nuevos ·{" "}
          {existing} ya registrados
        </p>
        <p className="muted text-xs">
          Puedes combinar meses hasta 62 días. Los registros existentes
          conservarán sus notas.
        </p>
        <Button type="button" variant="ghost" onClick={() => setDates([])}>
          Limpiar selección de días
        </Button>
        <label>
          Nota para los días nuevos
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button disabled={!dates.length || dates.length === existing}>
          Guardar días seleccionados
        </Button>
      </fieldset>
    </form>
  );
}
