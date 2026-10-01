"use client";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { Heatmap } from "./heatmap";
import { Button } from "@/components/ui/button";
import { monthlySummary, type Activity, type Library } from "../domain/model";
import { Cover } from "./shared";
import { formatDate, monthLabel, plural } from "./format";

export function shiftMonth(month: string, n: number) {
  const d = new Date(month + "-15T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

// Agrupa actividades (ya ordenadas) por mes, conservando el orden.
export function groupByMonth(items: Activity[]) {
  const groups: { month: string; items: Activity[] }[] = [];
  for (const a of items) {
    const month = a.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(a);
    else groups.push({ month, items: [a] });
  }
  return groups;
}

const PAGE = 30;

export function Recent({
  state,
  onEdit,
  onAll,
  full = false,
  initialGameId,
}: {
  state: Library;
  onEdit: (a: Activity) => void;
  onAll?: () => void;
  full?: boolean;
  initialGameId?: string;
}) {
  const [page, setPage] = useState(1),
    // El diario puede abrirse ya filtrado desde la ficha (?juego=id).
    [gameId, setGameId] = useState(() => {
      if (!full || typeof window === "undefined") return "";
      const id =
        initialGameId ??
        new URLSearchParams(window.location.search).get("juego");
      return id && state.games.some((g) => g.id === id) ? id : "";
    }),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const games = useMemo(
    () => new Map(state.games.map((g) => [g.id, g])),
    [state.games],
  );
  const items = useMemo(
    () =>
      state.activities
        .filter(
          (a) =>
            games.has(a.gameId) &&
            (!full ||
              ((!gameId || a.gameId === gameId) &&
                (!from || a.date >= from) &&
                (!to || a.date <= to))),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.activities, games, full, gameId, from, to],
  );
  const filtering = !!(gameId || from || to);
  const visible = items.slice(
    full ? (page - 1) * PAGE : 0,
    full ? page * PAGE : 3,
  );
  const row = (a: Activity) => {
    const g = games.get(a.gameId)!;
    return (
      <button className="activity-row" key={a.id} onClick={() => onEdit(a)}>
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
  };
  const reset = (change: () => void) => {
    change();
    setPage(1);
  };
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
      {full && (
        <div className="journal-filters">
          <label>
            Juego
            <select
              value={gameId}
              onChange={(e) => reset(() => setGameId(e.target.value))}
            >
              <option value="">Todos los juegos</option>
              {[...state.games]
                .sort((a, b) => a.title.localeCompare(b.title, "es"))
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => reset(() => setFrom(e.target.value))}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => reset(() => setTo(e.target.value))}
            />
          </label>
          {filtering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                reset(() => {
                  setGameId("");
                  setFrom("");
                  setTo("");
                })
              }
            >
              Quitar filtros
            </Button>
          )}
          <span className="muted text-xs" role="status">
            {plural(items.length, "día registrado", "días registrados")}
          </span>
        </div>
      )}
      {items.length ? (
        full ? (
          groupByMonth(visible).map((group) => (
            <div className="journal-month" key={group.month}>
              <h3>
                {monthLabel(group.month)}
                <small>
                  {plural(group.items.length, "registro", "registros")}
                </small>
              </h3>
              {group.items.map(row)}
            </div>
          ))
        ) : (
          visible.map(row)
        )
      ) : (
        <p className="muted py-8">
          {filtering
            ? "No hay días registrados con estos filtros."
            : "Tu próximo día de juego aparecerá aquí."}
        </p>
      )}
      {full && items.length > PAGE && (
        <div className="pagination">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>
            {page} / {Math.ceil(items.length / PAGE)}
          </span>
          <Button
            variant="secondary"
            disabled={page * PAGE >= items.length}
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
  onJournal,
}: {
  state: Library;
  today: string;
  month: string;
  onMonth: (month: string) => void;
  onDay: (date: string) => void;
  onBulk: () => void;
  onJournal: () => void;
}) {
  const summary = monthlySummary(state, month);
  const games = useMemo(
    () => new Map(state.games.map((g) => [g.id, g])),
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
        <Button
          variant="ghost"
          onClick={onJournal}
          className="calendar-bulk calendar-journal"
        >
          <NotebookPen size={16} /> Ver diario
        </Button>
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
                  formatDate(date) +
                  (items.length
                    ? ": " +
                      items.map((a) => games.get(a.gameId)?.title).join(", ")
                    : "")
                }
              >
                <span>{i + 1}</span>
                {/* Portadas pequeñas: el mes se lee de un vistazo. */}
                <span className="calendar-covers" aria-hidden="true">
                  {items.slice(0, 3).map((a) => {
                    const g = games.get(a.gameId);
                    return g?.cover ? (
                      <img
                        key={a.id}
                        src={g.cover}
                        alt=""
                        title={g.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <i key={a.id} title={g?.title}>
                        {g?.title.slice(0, 1)}
                      </i>
                    );
                  })}
                  {items.length > 3 && <b>+{items.length - 3}</b>}
                </span>
              </button>
            );
          },
        )}
      </div>
      <h3 className="calendar-year-title">Tu año de un vistazo</h3>
      <Heatmap
        state={state}
        year={month.slice(0, 4)}
        onDay={(date) => {
          onMonth(date.slice(0, 7));
          onDay(date);
        }}
      />
      <p className="muted text-sm mt-5">
        Las fechas siguen tu zona horaria: {state.profile.timezone}. Toca un día
        para añadir o editar actividad.
      </p>
    </section>
  );
}
