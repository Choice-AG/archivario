"use client";
import { useState } from "react";
import { useCatalogTimes } from "./use-api";
import { Button } from "@/components/ui/button";
import type { Game, GameTimes, Library } from "../domain/model";
import { formatHours, timeLabels } from "../domain/daily";
import type { ApiRequest, Execute } from "./shared";
const modes = ["main", "extras", "complete"] as const;
export function GameTimeForm({
  game,
  state,
  request,
  execute,
  demo,
}: {
  game: Game;
  state: Library;
  request: ApiRequest;
  execute: Execute;
  demo: boolean;
}) {
  const remote = useCatalogTimes(request, game.catalogId, !demo);
  const [edited, setEdited] = useState<GameTimes>(),
    [pending, setPending] = useState(false),
    [saveError, setSaveError] = useState(""),
    [saved, setSaved] = useState(false);
  // Lo guardado en la ficha manda sobre IGDB; lo editado aquí, sobre ambos.
  const times = edited ?? { ...remote.data, ...game.times },
    loading = remote.loading,
    error = saveError || remote.error;
  const setTimes = (update: (current: GameTimes) => GameTimes) =>
    setEdited((current) => update(current ?? times));
  const message = saved
    ? "Tiempos guardados."
    : remote.data
      ? Object.keys(remote.data).length
        ? "Estimaciones de IGDB disponibles. Guarda para usarlas en filtros y comparaciones."
        : "IGDB no tiene tiempos para este juego. Puedes introducirlos manualmente."
      : "";
  const runs = state.runs.filter(
    (r) => r.gameId === game.id && r.completionMinutes !== undefined,
  );
  return (
    <section>
      <p className="info-note">
        Estimaciones del juego completo. Tu tiempo real se registra por separado
        en «Partidas», a partir del total que indica el juego.
      </p>
      {loading && <p role="status">Consultando tiempos de IGDB…</p>}
      {message && (
        <p role="status" className="muted text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}{" "}
          <button className="text-link" onClick={remote.retry}>
            Reintentar
          </button>
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setSaveError("");
          try {
            await execute({ type: "save-game", game: { ...game, times } });
            setSaved(true);
          } catch (e) {
            setSaveError((e as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        <fieldset disabled={pending || loading}>
          {modes.map((mode) => (
            <label key={mode}>
              {timeLabels[mode]} (h)
              <input
                type="number"
                min={0}
                max={10000}
                step={0.1}
                value={times[mode]?.hours ?? ""}
                onChange={(e) =>
                  setTimes((current) => {
                    const next = { ...current };
                    if (e.target.value === "") delete next[mode];
                    else
                      next[mode] = {
                        hours: Number(e.target.value),
                        source: "manual",
                      };
                    return next;
                  })
                }
              />
              <small>
                {times[mode]
                  ? "Fuente: " + times[mode]!.source
                  : "Sin estimación"}
              </small>
            </label>
          ))}
          <Button>Guardar tiempos</Button>
        </fieldset>
      </form>
      {game.approximateHours !== undefined && (
        <p className="muted text-sm mt-3">
          Tu estimación anterior: {formatHours(game.approximateHours)}. Se usa
          si no hay estimación de historia principal.
        </p>
      )}
      <h3 className="mt-5">Tu tiempo real por partida</h3>
      {runs.length ? (
        runs.map((r) => (
          <p className="time-real" key={r.id}>
            {r.label} · {Math.floor(r.completionMinutes! / 60)} h{" "}
            {r.completionMinutes! % 60} min
          </p>
        ))
      ) : (
        <p className="muted text-sm">
          Aún no has registrado un tiempo real en tus partidas.
        </p>
      )}
    </section>
  );
}
