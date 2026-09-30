"use client";
import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activityId,
  statuses,
  type Activity,
  type Game,
  type Library,
  type Run,
} from "../domain/model";
import {
  changeRunStatus,
  estimatedHours,
  timeLabels,
  type TimeMode,
} from "../domain/daily";
import type { GameSort } from "../domain/insights";
import { BatchLibrary, ContinuePlaying } from "./library-improvements";
import { GameCard } from "./game-card";
import { MonthCard, Recent } from "./journal";
import { useFilteredGames, type useLibraryFilters } from "./library-filters";
import type { Execute } from "./shared";

const PAGE = 12;

export function LibraryView({
  state,
  view,
  today,
  busy,
  filterState,
  execute,
  onNotice,
  onGame,
  onSagas,
  onAdd,
  onPlanning,
  onYear,
  onActivity,
  onEditActivity,
  onJournal,
}: {
  state: Library;
  view: string;
  today: string;
  busy: boolean;
  filterState: ReturnType<typeof useLibraryFilters>;
  execute: Execute;
  onNotice: (message: string) => void;
  onGame: (id: string) => void;
  onSagas: () => void;
  onAdd: () => void;
  onPlanning: () => void;
  onYear: () => void;
  onActivity: (gameId: string) => void;
  onEditActivity: (a: Activity) => void;
  onJournal: () => void;
}) {
  const { filters: f, set, reset, page, setPage } = filterState;
  const { filtered, runOf } = useFilteredGames(state, f, view);
  const [selecting, setSelecting] = useState(false),
    [selectedIds, setSelectedIds] = useState<string[]>([]);
  const platforms = useMemo(
    () => [...new Set(state.games.flatMap((g) => g.platforms))].sort(),
    [state.games],
  );
  const genres = useMemo(
    () => [...new Set(state.games.flatMap((g) => g.genres))].sort(),
    [state.games],
  );
  const playedToday = useMemo(
    () =>
      new Set(
        state.activities.filter((a) => a.date === today).map((a) => a.gameId),
      ),
    [state.activities, today],
  );
  const run = async (command: Parameters<Execute>[0]) => {
    try {
      await execute(command);
    } catch {
      // El error ya se muestra en el aviso global de la biblioteca.
    }
  };
  const markToday = (g: Game) => {
    if (playedToday.has(g.id)) {
      onNotice("Este juego ya está registrado hoy.");
      return;
    }
    run({
      type: "save-activity",
      activity: {
        id: activityId(g.id, today),
        gameId: g.id,
        runId: g.primaryRunId,
        date: today,
        note: "",
      },
    });
  };
  const visible = filtered.slice((page - 1) * PAGE, page * PAGE);
  return (
    <>
      {view === "Biblioteca" && (
        <ContinuePlaying
          state={state}
          onGame={onGame}
          onActivity={onActivity}
        />
      )}
      <div className="library-tools">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar en mi biblioteca"
            placeholder="Buscar títulos, notas y reseñas…"
            value={f.query}
            onChange={(e) => set("query", e.target.value)}
          />
          <kbd>⌕</kbd>
        </div>
        <div className="filters">
          <select
            aria-label="Filtrar por plataforma"
            value={f.platform}
            onChange={(e) => set("platform", e.target.value)}
          >
            <option value="Todas">Todas las plataformas</option>
            {platforms.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por género"
            value={f.genre}
            onChange={(e) => set("genre", e.target.value)}
          >
            <option value="Todos">Todos los géneros</option>
            {genres.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            aria-label="Tipo de duración"
            value={f.timeMode}
            onChange={(e) => set("timeMode", e.target.value as TimeMode)}
          >
            {Object.entries(timeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Duración aproximada"
            value={f.duration}
            onChange={(e) => set("duration", e.target.value)}
          >
            <option value="Cualquiera">Cualquier duración</option>
            <option value="short">Hasta 10 h aprox.</option>
            <option value="medium">Entre 10 y 30 h aprox.</option>
            <option value="long">Más de 30 h aprox.</option>
          </select>
        </div>
      </div>
      <div className="library-extras">
        <Button variant="secondary" onClick={onSagas}>
          Mis sagas ({state.sagas?.length ?? 0})
        </Button>
        <Button
          variant="secondary"
          aria-pressed={selecting}
          onClick={() => {
            setSelecting(!selecting);
            setSelectedIds([]);
          }}
        >
          {selecting ? "Terminar selección" : "Seleccionar juegos"}
        </Button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={f.searchSpoilers}
            onChange={(e) => set("searchSpoilers", e.target.checked)}
          />{" "}
          Buscar también en spoilers
        </label>
        <select
          aria-label="Disponibilidad de los juegos"
          value={f.ownership}
          onChange={(e) => set("ownership", e.target.value)}
        >
          <option value="owned">Mi biblioteca</option>
          <option value="wishlist">Lista de deseos</option>
          <option value="all">Biblioteca y deseos</option>
        </select>
        <Button variant="secondary" onClick={onPlanning}>
          Listas y planes
        </Button>
        <select
          aria-label="Filtrar por valoración"
          value={f.ratingFilter}
          onChange={(e) => set("ratingFilter", e.target.value)}
        >
          <option value="all">Todas las valoraciones</option>
          <option value="unrated">Sin valorar</option>
          <option value="unreviewed">Sin reseña</option>
        </select>
        <Button variant="secondary" onClick={onYear}>
          Mi resumen anual
        </Button>
        <Button variant="ghost" onClick={() => reset()}>
          Limpiar filtros
        </Button>
        <span className="muted text-xs" role="status">
          {filtered.length} juegos
        </span>
      </div>
      <div className="status-row">
        <div className="status-tabs">
          {["Todos", ...statuses].map((s) => (
            <button
              key={s}
              aria-pressed={f.status === s}
              className={f.status === s ? "selected" : ""}
              onClick={() => set("status", s)}
            >
              {s === "Todos" ? "Todos" : s[0].toUpperCase() + s.slice(1)}
              {s === "Todos" && <span>{state.games.length}</span>}
            </button>
          ))}
        </div>
        <select
          aria-label="Ordenar biblioteca"
          value={f.sort}
          onChange={(e) => set("sort", e.target.value as GameSort)}
        >
          <option value="recent">Última actividad</option>
          <option value="title">Título A–Z</option>
          <option value="rating">Mi nota: mayor primero</option>
          <option value="shortest">Duración: más cortos primero</option>
        </select>
      </div>
      {selecting && (
        <>
          <div className="form-actions">
            <Button
              variant="ghost"
              onClick={() => setSelectedIds(filtered.map((g) => g.id))}
            >
              Seleccionar resultados filtrados
            </Button>
            <Button variant="ghost" onClick={() => setSelectedIds([])}>
              Vaciar selección
            </Button>
          </div>
          <BatchLibrary
            state={state}
            ids={selectedIds.filter((id) =>
              state.games.some((g) => g.id === id),
            )}
            execute={execute}
            today={today}
            onDone={() => setSelectedIds([])}
          />
        </>
      )}
      {filtered.length ? (
        <div className="game-grid">
          {visible.map((g) => {
            const r = runOf(g)!;
            return (
              <GameCard
                key={g.id}
                game={g}
                run={r}
                hours={estimatedHours(g, f.timeMode)}
                timeMode={f.timeMode}
                playedToday={playedToday.has(g.id)}
                busy={busy}
                selecting={selecting}
                selected={selectedIds.includes(g.id)}
                onSelect={(checked) =>
                  setSelectedIds((ids) =>
                    checked ? [...ids, g.id] : ids.filter((id) => id !== g.id),
                  )
                }
                onOpen={() => onGame(g.id)}
                onFavorite={() =>
                  run({
                    type: "save-game",
                    game: { ...g, favorite: !g.favorite },
                  })
                }
                onStatus={(status: Run["status"]) =>
                  run({
                    type: "save-run",
                    run: changeRunStatus(r, status, today),
                    primary: true,
                  })
                }
                onToday={() => markToday(g)}
              />
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen size={36} />
          <h2>
            {state.games.length
              ? "Aquí todavía no hay juegos."
              : "Tu biblioteca empieza con un juego."}
          </h2>
          <p>
            {state.games.length
              ? "Prueba otros filtros o elige juegos desde su ficha."
              : "Busca en el catálogo o añade tu primer juego manualmente."}
          </p>
          <Button variant="secondary" onClick={onAdd}>
            Añadir juego
          </Button>
        </div>
      )}
      {filtered.length > PAGE && (
        <div className="pagination">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>
            {page} / {Math.ceil(filtered.length / PAGE)}
          </span>
          <Button
            variant="secondary"
            disabled={page * PAGE >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
      <div className="dashboard-bottom">
        <Recent state={state} onEdit={onEditActivity} onAll={onJournal} />
        <MonthCard state={state} today={today} />
      </div>
    </>
  );
}
