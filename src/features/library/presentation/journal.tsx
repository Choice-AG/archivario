"use client";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthlySummary, type Activity, type Library } from "../domain/model";
import { Cover } from "./shared";
import { monthLabel, plural } from "./format";

export function shiftMonth(month: string, n: number) {
  const d = new Date(month + "-15T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export function Recent({
  state,
  onEdit,
  onAll,
  full = false,
}: {
  state: Library;
  onEdit: (a: Activity) => void;
  onAll?: () => void;
  full?: boolean;
}) {
  const [page, setPage] = useState(1);
  const games = useMemo(
    () => new Map(state.games.map((g) => [g.id, g])),
    [state.games],
  );
  const items = useMemo(
    () =>
      state.activities
        .filter((a) => games.has(a.gameId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.activities, games],
  );
  return (
    <section className={full ? "" : "recent-panel"}>
      {!full && (
        <div className="section-header">
          <h2>Últimas aventuras</h2>
          <button className="text-link" onClick={onAll}>
            Ver diario <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      {items.length ? (
        items
          .slice(full ? (page - 1) * 20 : 0, full ? page * 20 : 3)
          .map((a) => {
            const g = games.get(a.gameId)!;
            return (
              <button
                className="activity-row"
                key={a.id}
                onClick={() => onEdit(a)}
              >
                <Cover game={g} />
                <span>
                  <strong>{g.title}</strong>
                  <small>
                    {new Intl.DateTimeFormat("es", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(a.date + "T12:00:00"))}{" "}
                    <span>·</span> {a.note || "Una nueva aventura"}
                  </small>
                </span>
                <ChevronRight size={17} />
              </button>
            );
          })
      ) : (
        <p className="muted py-8">Tu próximo día de juego aparecerá aquí.</p>
      )}
      {full && items.length > 20 && (
        <div className="pagination">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>Página {page}</span>
          <Button
            variant="secondary"
            disabled={page * 20 >= items.length}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </section>
  );
}

export function MonthCard({ state, today }: { state: Library; today: string }) {
  const summary = monthlySummary(state, today.slice(0, 7));
  return (
    <section className="month-card">
      <p className="eyebrow">PEQUEÑOS GRANDES VIAJES</p>
      <h2>Tu mes, a tu ritmo.</h2>
      <p className="muted month-name">{monthLabel(today)}</p>
      <div className="summary-grid">
        <div>
          <strong>{summary.games}</strong>
          <span>
            {summary.games === 1 ? "juego disfrutado" : "juegos disfrutados"}
          </span>
        </div>
        <div>
          <strong>{summary.days}</strong>
          <span>
            {summary.days === 1 ? "día con actividad" : "días con actividad"}
          </span>
        </div>
        <div>
          <strong>{summary.completed}</strong>
          <span>
            {summary.completed === 1
              ? "partida completada"
              : "partidas completadas"}
          </span>
        </div>
      </div>
      <p className="month-foot">
        <Sparkles size={15} /> Cada aventura cuenta, dure lo que dure.
      </p>
    </section>
  );
}

export function CalendarView({
  state,
  today,
  month,
  onMonth,
  onDay,
  onBulk,
}: {
  state: Library;
  today: string;
  month: string;
  onMonth: (month: string) => void;
  onDay: (date: string) => void;
  onBulk: () => void;
}) {
  const summary = monthlySummary(state, month);
  const titles = useMemo(
    () => new Map(state.games.map((g) => [g.id, g.title])),
    [state.games],
  );
  const byDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of state.activities)
      if (a.date.startsWith(month))
        map.set(a.date, [...(map.get(a.date) ?? []), a]);
    return map;
  }, [state.activities, month]);
  return (
    <section className="panel">
      <div className="section-header">
        <h2>Calendario</h2>
        <Button variant="secondary" onClick={onBulk} className="calendar-bulk">
          Registrar varios días
        </Button>
        <div className="month-nav">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => onMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft size={18} />
          </Button>
          <input
            aria-label="Mes del calendario"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) onMonth(e.target.value);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => onMonth(shiftMonth(month, 1))}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
      <p className="calendar-summary">
        {plural(summary.games, "juego", "juegos")} ·{" "}
        {plural(summary.days, "día activo", "días activos")} ·{" "}
        {plural(
          summary.completed,
          "partida completada",
          "partidas completadas",
        )}
      </p>
      <div className="calendar-grid">
        {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({
          length: (new Date(month + "-01T12:00:00").getDay() + 6) % 7,
        }).map((_, i) => (
          <div key={"blank" + i} />
        ))}
        {Array.from(
          {
            length: new Date(
              Number(month.slice(0, 4)),
              Number(month.slice(5)),
              0,
            ).getDate(),
          },
          (_, i) => {
            const date = month + "-" + String(i + 1).padStart(2, "0"),
              items = byDate.get(date) ?? [];
            return (
              <button
                key={date}
                className={"calendar-day " + (date === today ? "today" : "")}
                onClick={() => onDay(date)}
                aria-label={
                  date + (items.length ? ", " + items.length + " juegos" : "")
                }
              >
                <span>{i + 1}</span>
                {items.slice(0, 3).map((a) => (
                  <small key={a.id}>{titles.get(a.gameId)}</small>
                ))}
                {items.length > 3 && <small>+{items.length - 3} más</small>}
              </button>
            );
          },
        )}
      </div>
      <p className="muted text-sm mt-5">
        Las fechas siguen tu zona horaria: {state.profile.timezone}. Toca un día
        para añadir o editar actividad.
      </p>
    </section>
  );
}
