"use client";
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
          <h3>Tus mejor valorados de este año</h3>
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
