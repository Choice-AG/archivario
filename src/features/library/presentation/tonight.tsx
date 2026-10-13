"use client";
import { useMemo, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Library } from "../domain/model";
import {
  suggestTonight,
  tonightMoods,
  tonightTimes,
  type TonightMood,
  type TonightTime,
} from "../domain/tonight";
import { Cover, type Execute } from "./shared";

const SHOWN = 3;

function Choices<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="add-question tonight-question">
      <legend>{legend}</legend>
      <div className="choice-chips">
        {options.map(([v, label]) => (
          <button
            type="button"
            key={v}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Tres propuestas con su porqué. «Otras ideas» enseña las siguientes.
export function Tonight({
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
  const [time, setTime] = useState<TonightTime>("tarde"),
    [platform, setPlatform] = useState(""),
    [mood, setMood] = useState<TonightMood>("igual"),
    [page, setPage] = useState(0),
    [error, setError] = useState("");
  const platforms = useMemo(
    () =>
      [
        ...new Set(
          state.games.filter((g) => !g.wishlist).flatMap((g) => g.platforms),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [state.games],
  );
  const all = useMemo(
    () => suggestTonight(state, { time, platform, mood }, today),
    [state, time, platform, mood, today],
  );
  const pages = Math.ceil(all.length / SHOWN);
  const shown = all.slice(page * SHOWN, page * SHOWN + SHOWN);
  const change =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };
  const timer = state.profile.timer;
  return (
    <div className="tonight">
      <Choices
        legend="¿Cuánto tiempo tienes?"
        options={tonightTimes}
        value={time}
        onChange={change(setTime)}
      />
      {platforms.length > 1 && (
        <Choices
          legend="¿Dónde vas a jugar?"
          options={
            [["", "Donde sea"], ...platforms.map((p) => [p, p])] as [
              string,
              string,
            ][]
          }
          value={platform}
          onChange={change(setPlatform)}
        />
      )}
      <Choices
        legend="¿Qué te apetece?"
        options={tonightMoods}
        value={mood}
        onChange={change(setMood)}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {shown.length ? (
        <ol className="tonight-list" aria-label="Propuestas para esta noche">
          {shown.map(({ game, reasons }) => (
            <li key={game.id} className="tonight-card">
              <button
                className="tonight-cover"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => onGame(game.id)}
              >
                <Cover game={game} />
              </button>
              <div>
                <h3>{game.title}</h3>
                <ul className="tonight-reasons">
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="form-actions">
                  {!timer && (
                    <Button
                      size="sm"
                      aria-label={"Jugar ahora a " + game.title}
                      onClick={async () => {
                        setError("");
                        try {
                          await execute({
                            type: "timer",
                            timer: {
                              gameId: game.id,
                              runId: game.primaryRunId,
                              startedAt: new Date().toISOString(),
                            },
                          });
                          onGame(game.id);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      <Play size={14} /> Jugar ahora
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={"Ver la ficha de " + game.title}
                    onClick={() => onGame(game.id)}
                  >
                    Ver la ficha
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="info-note" role="status">
          {mood === "seguir"
            ? "No tienes nada empezado con estas opciones. Prueba a empezar algo nuevo."
            : mood === "nuevo"
              ? "No hay pendientes con estas opciones. Prueba con otra plataforma."
              : "No hay juegos pendientes ni empezados con estas opciones."}
        </p>
      )}
      {pages > 1 && (
        <Button
          variant="ghost"
          onClick={() => setPage((page + 1) % pages)}
          className="tonight-more"
        >
          <RefreshCw size={15} />
          {page + 1 < pages ? " Otras ideas" : " Volver a las primeras"}
        </Button>
      )}
      {timer && (
        <p className="muted text-sm">
          Tienes una sesión en marcha: párala antes de empezar otra.
        </p>
      )}
    </div>
  );
}
