"use client";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  History,
  Rocket,
  Search,
  Sparkles,
} from "lucide-react";
import { Heatmap } from "./heatmap";
import { Button } from "@/components/ui/button";
import { monthlySummary, type Activity, type Library } from "../domain/model";
import { formatMinutes, minutesIn, sumMinutes } from "../domain/session";
import { groupByDay, onThisDay, searchJournal } from "../domain/memories";
import { ShareRecap } from "./recap-share";
import { recapData } from "./recap-data";
import { daysBetween, releasesIn } from "../domain/releases";
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

const weekday = new Intl.DateTimeFormat("es", {
  weekday: "long",
  timeZone: "UTC",
});
// «jueves 26» o, si es hoy o ayer, eso mismo.
function dayTitle(date: string, today?: string) {
  const d = new Date(date + "T12:00:00Z");
  const name = weekday.format(d) + " " + d.getUTCDate();
  if (today && date === today) return "Hoy · " + name;
  if (today && daysBetween(date, today) === 1) return "Ayer · " + name;
  return name[0].toLocaleUpperCase("es") + name.slice(1);
}

// «Tal día como hoy»: un recuerdo de otros años, si lo hay.
export function OnThisDay({
  state,
  today,
  onEdit,
}: {
  state: Library;
  today: string;
  onEdit: (a: Activity) => void;
}) {
  const memories = useMemo(() => onThisDay(state, today), [state, today]);
  if (!memories.length) return null;
  return (
    <section className="on-this-day" aria-labelledby="on-this-day-title">
      <h2 id="on-this-day-title">
        <History size={16} aria-hidden="true" /> Tal día como hoy
      </h2>
      <ul>
        {memories.map(({ activity, game, years }) => (
          <li key={activity.id}>
            <button onClick={() => onEdit(activity)}>
              <Cover game={game} />
              <span>
                <small>
                  {years === 1 ? "Hace un año" : "Hace " + years + " años"}
                </small>
                <strong>{game.title}</strong>
                {activity.note && <q>{activity.note}</q>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Recent({
  state,
  onEdit,
  onAll,
  full = false,
  initialGameId,
  today,
}: {
  state: Library;
  onEdit: (a: Activity) => void;
  onAll?: () => void;
  full?: boolean;
  initialGameId?: string;
  today?: string;
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
    [to, setTo] = useState(""),
    [query, setQuery] = useState(""),
    [showDates, setShowDates] = useState(false);
  const games = useMemo(
    () => new Map(state.games.map((g) => [g.id, g])),
    [state.games],
  );
  const items = useMemo(
    () =>
      searchJournal(
        state.activities.filter(
          (a) =>
            games.has(a.gameId) &&
            (!full ||
              ((!gameId || a.gameId === gameId) &&
                (!from || a.date >= from) &&
                (!to || a.date <= to))),
        ),
        games,
        full ? query : "",
      ).sort((a, b) => b.date.localeCompare(a.date)),
    [state.activities, games, full, gameId, from, to, query],
  );
  const filtering = !!(gameId || from || to || query.trim());
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
            {a.minutes ? (
              <>
                <span>·</span> {formatMinutes(a.minutes)}{" "}
              </>
            ) : null}
            <span>·</span> {a.note || "Una nueva aventura"}
          </small>
        </span>
        <ChevronRight size={17} />
      </button>
    );
  };
  // En el diario completo, cada entrada enseña la nota entera y el tiempo.
  const entry = (a: Activity) => {
    const g = games.get(a.gameId)!;
    return (
      <button
        className="activity-row journal-entry"
        key={a.id}
        onClick={() => onEdit(a)}
        aria-label={
          "Editar " +
          g.title +
          ", " +
          formatDate(a.date) +
          (a.note ? ": " + a.note : "")
        }
      >
        <Cover game={g} />
        <span>
          <strong>{g.title}</strong>
          {a.note ? (
            <span className="journal-note">{a.note}</span>
          ) : (
            <span className="journal-note empty">Un día de juego</span>
          )}
        </span>
        {a.minutes ? (
          <span className="journal-time">{formatMinutes(a.minutes)}</span>
        ) : null}
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
      {full && today && !filtering && (
        <OnThisDay state={state} today={today} onEdit={onEdit} />
      )}
      {full && (
        <div className="journal-filters">
          <div className="search-field journal-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar en el diario"
              placeholder="Buscar en tus notas…"
              value={query}
              onChange={(e) => reset(() => setQuery(e.target.value))}
            />
          </div>
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
          {showDates || from || to ? (
            <>
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
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDates(true)}
            >
              <CalendarRange size={15} /> Entre fechas
            </Button>
          )}
          {filtering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                reset(() => {
                  setGameId("");
                  setFrom("");
                  setTo("");
                  setQuery("");
                  setShowDates(false);
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
              {groupByDay(group.items).map((d) => (
                <div className="journal-day" key={d.date}>
                  <h4>
                    <time dateTime={d.date}>{dayTitle(d.date, today)}</time>
                    {sumMinutes(d.items) > 0 && d.items.length > 1 && (
                      <small>{formatMinutes(sumMinutes(d.items))}</small>
                    )}
                  </h4>
                  {d.items.map(entry)}
                </div>
              ))}
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
  const minutes = minutesIn(state, today.slice(0, 7));
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
        {minutes > 0 && (
          <div>
            <strong>{formatMinutes(minutes)}</strong>
            <span>jugados según tu diario</span>
          </div>
        )}
      </div>
      <p className="month-foot">
        <Sparkles size={15} /> Cada aventura cuenta, dure lo que dure.
      </p>
      {summary.games > 0 && (
        <ShareRecap
          build={() => recapData(state, today.slice(0, 7))}
          filename={"archivario-" + today.slice(0, 7) + ".png"}
          label="Tu mes en una imagen"
        />
      )}
    </section>
  );
}

export function CalendarView({
  state,
  today,
  month,
  onMonth,
  onDay,
}: {
  state: Library;
  today: string;
  month: string;
  onMonth: (month: string) => void;
  onDay: (date: string) => void;
}) {
  const summary = monthlySummary(state, month);
  const minutes = minutesIn(state, month);
  // Lanzamientos de lo que esperas, marcados en su día.
  const launches = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const g of releasesIn(state, month))
      map.set(g.releaseDate!, [...(map.get(g.releaseDate!) ?? []), g.title]);
    return map;
  }, [state, month]);
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
        {minutes > 0 && " · " + formatMinutes(minutes) + " jugados"}
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
              items = byDate.get(date) ?? [],
              launch = launches.get(date);
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
                    : "") +
                  (launch ? ". Sale " + launch.join(", ") : "")
                }
              >
                <span>{i + 1}</span>
                {launch && (
                  <span
                    className="calendar-launch"
                    title={"Sale " + launch.join(", ")}
                    aria-hidden="true"
                  >
                    <Rocket size={11} />{" "}
                    {launch.length > 1 ? launch.length : ""}
                  </span>
                )}
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
