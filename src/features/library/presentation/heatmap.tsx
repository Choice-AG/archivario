"use client";
import { useMemo } from "react";
import type { Library } from "../domain/model";
import { heatLevel, heatmap } from "../domain/profile";
import { formatDate, plural } from "./format";

const months = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// Días jugados del año en una cuadrícula de semanas. Sin rachas: solo color.
export function Heatmap({
  state,
  year,
  years,
  onYear,
  onDay,
}: {
  state: Library;
  year: string;
  years?: string[];
  onYear?: (year: string) => void;
  onDay?: (date: string) => void;
}) {
  const map = useMemo(() => heatmap(state, year), [state, year]);
  // Columna en la que empieza cada mes, para las etiquetas de arriba.
  const starts = map.weeks.flatMap((week, i) => {
    const first = week.find((d) => d?.date.endsWith("-01"));
    return first ? [{ col: i, month: Number(first.date.slice(5, 7)) - 1 }] : [];
  });
  return (
    <div className="heatmap">
      <div className="heatmap-head">
        <p role="status">
          <strong>{plural(map.days, "día jugado", "días jugados")}</strong> en{" "}
          {year}
        </p>
        {years && years.length > 1 && onYear && (
          <label>
            <span className="sr-only">Año del mapa de actividad</span>
            <select value={year} onChange={(e) => onYear(e.target.value)}>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="heatmap-scroll">
        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: `repeat(${map.weeks.length}, 1fr)` }}
        >
          {starts.map((s) => (
            <span
              key={s.month}
              className="heatmap-month"
              style={{ gridColumn: s.col + 1, gridRow: 1 }}
              aria-hidden="true"
            >
              {months[s.month]}
            </span>
          ))}
          {map.weeks.map((week, col) =>
            week.map((day, row) => {
              const style = { gridColumn: col + 1, gridRow: row + 2 };
              if (!day) return <span key={col + "-" + row} style={style} />;
              const level = heatLevel(day.count, map.max);
              const label =
                formatDate(day.date) +
                ": " +
                (day.count
                  ? plural(day.count, "juego", "juegos")
                  : "sin jugar");
              return day.count && onDay ? (
                <button
                  key={day.date}
                  className={"heat heat-" + level}
                  style={style}
                  title={label}
                  aria-label={label}
                  onClick={() => onDay(day.date)}
                />
              ) : (
                <span
                  key={day.date}
                  className={"heat heat-" + level}
                  style={style}
                  title={label}
                  aria-hidden="true"
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        Menos
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={"heat heat-" + l} />
        ))}
        Más
      </div>
    </div>
  );
}
