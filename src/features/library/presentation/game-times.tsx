"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Game, GameTimes, Library } from "../domain/model";
import { formatHours, timeLabels, type TimeMode } from "../domain/daily";
import type { ApiRequest, Execute } from "./app";
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
  const [times, setTimes] = useState<GameTimes>(game.times ?? {}),
    [loading, setLoading] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (demo || !game.catalogId) return;
    const c = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    request("/api/catalog/times?id=" + game.catalogId, { signal: c.signal })
      .then((r) => r.json())
      .then((data: GameTimes) => {
        if (active) {
          setTimes((current) => ({ ...data, ...current }));
          setMessage(
            Object.keys(data).length
              ? "Estimaciones de IGDB disponibles. Guarda para usarlas en filtros y comparaciones."
              : "IGDB no tiene tiempos para este juego. Puedes introducirlos manualmente.",
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [game.catalogId, request, demo, retry]);
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
          <button className="text-link" onClick={() => setRetry((n) => n + 1)}>
            Reintentar
          </button>
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          try {
            await execute({ type: "save-game", game: { ...game, times } });
            setMessage("Tiempos guardados.");
          } catch (e) {
            setError((e as Error).message);
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
          Referencia manual anterior: {formatHours(game.approximateHours)}. Se
          usa si no hay estimación de historia principal.
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
