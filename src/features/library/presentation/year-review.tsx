"use client";
import { formatDate, plural } from "./format";
import { useState } from "react";
import type { Library } from "../domain/model";
import { annualSummary } from "../domain/insights";
export function YearReview({
  state,
  today,
  onGame,
}: {
  state: Library;
  today: string;
  onGame: (id: string) => void;
}) {
  const current = today.slice(0, 4);
  const [year, setYear] = useState(current);
  const years = [
    ...new Set([
      current,
      ...state.activities.map((a) => a.date.slice(0, 4)),
      ...state.runs.flatMap((r) =>
        r.completedOn ? [r.completedOn.slice(0, 4)] : [],
      ),
    ]),
  ]
    .sort()
    .reverse();
  const summary = annualSummary(state, year);
  const labels = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const fullMonths = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return (
    <section className="year-review">
      <label>
        Año del resumen
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>
      <div className="summary-grid">
        <div>
          <strong>{summary.games}</strong>
          <span>juegos disfrutados</span>
        </div>
        <div>
          <strong>{summary.days}</strong>
          <span>días con actividad</span>
        </div>
        <div>
          <strong>{summary.completed}</strong>
          <span>partidas completadas</span>
        </div>
      </div>
      {summary.games === 0 ? (
        <p className="info-note">
          Todavía no hay actividad ni partidas completadas en este año. Tu
          resumen crecerá con tus registros.
        </p>
      ) : (
        <>
          <h3>Tu actividad mes a mes</h3>
          <p className="muted text-xs">
            Días en los que registraste algún juego.
          </p>
          <div className="year-months">
            {summary.months.map((days, i) => (
              <div key={i}>
                <span>{labels[i]}</span>
                <progress
                  aria-label={labels[i] + ": " + days + " días activos"}
                  max={31}
                  value={days}
                />
                <strong>{days}</strong>
              </div>
            ))}
          </div>
          {summary.busiestMonth !== undefined && (
            <p className="muted text-sm mt-3">
              Tu mes con más actividad fue{" "}
              <strong>{fullMonths[summary.busiestMonth]}</strong>, con{" "}
              {plural(
                summary.months[summary.busiestMonth],
                "día de juego",
                "días de juego",
              )}
              .
            </p>
          )}
          {summary.first && summary.last && (
            <div className="year-bookends">
              {(
                [
                  ["Primer día de juego", summary.first],
                  ["Último día de juego", summary.last],
                ] as const
              ).map(([label, a]) => {
                const g = state.games.find((x) => x.id === a.gameId);
                return (
                  <button key={label} onClick={() => g && onGame(g.id)}>
                    <span>{label}</span>
                    <strong>{g?.title ?? "Juego eliminado"}</strong>
                    <small>{formatDate(a.date)}</small>
                  </button>
                );
              })}
            </div>
          )}
          <div className="year-breakdown">
            {(
              [
                ["Plataformas", summary.platforms],
                ["Géneros", summary.genres],
              ] as const
            ).map(([title, rows]) =>
              rows.length ? (
                <div key={title}>
                  <h3>{title}</h3>
                  <ul>
                    {rows.map((r) => (
                      <li key={r.name}>
                        <span>{r.name}</span>
                        <strong>{plural(r.count, "juego", "juegos")}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
          <h3>Tus juegos mejor valorados del año</h3>
          <p className="muted text-xs">
            Juegos con actividad o una partida completada en {year}, según tu
            nota actual.
          </p>
          {summary.average !== undefined ? (
            <>
              <p className="year-average">
                Nota media:{" "}
                <strong>
                  {summary.average.toLocaleString("es", {
                    maximumFractionDigits: 1,
                  })}
                  /10
                </strong>
              </p>
              {summary.best.map((g) => (
                <button
                  className="year-game"
                  key={g.id}
                  onClick={() => onGame(g.id)}
                >
                  <span>{g.title}</span>
                  <strong>{g.rating?.toLocaleString("es")}/10</strong>
                </button>
              ))}
            </>
          ) : (
            <p className="info-note">
              Valora tus juegos desde su ficha para ver tus favoritos del año.
            </p>
          )}
        </>
      )}
    </section>
  );
}
