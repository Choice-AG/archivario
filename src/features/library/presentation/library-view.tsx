"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  CalendarRange,
  Layers3,
  LayoutGrid,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Moon,
  Save,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
import { formats, type Format } from "../domain/model";
import { allTags, formatLabels, recommenders } from "../domain/organize";
import type { GameSort } from "../domain/insights";
import { BatchLibrary } from "./library-improvements";
import { NowPlaying } from "./now-playing";
import { GameCard, GameRow } from "./game-card";
import { Welcome } from "./welcome";
import { MonthCard, OnThisDay, Recent } from "./journal";
import { backlogHours } from "../domain/memories";
import { formatHours } from "../domain/daily";
import {
  countActiveFilters,
  filtersOfView,
  useFilteredGames,
  viewDefaults,
  viewFilters,
  type useLibraryFilters,
} from "./library-filters";
import type { ApiRequest, Execute } from "./shared";
import { statusLabel } from "./format";
import dynamic from "next/dynamic";
import type { ReleaseUpdate } from "./upcoming";

// Solo se usa en Próximos: se descarga al abrir esa vista.
const UpcomingReleases = dynamic(() =>
  import("./upcoming").then((m) => m.UpcomingReleases),
);

// En pantallas estrechas, el orden y la forma de ver los juegos van dentro
// del panel de filtros para dejar sitio a los juegos.
const NARROW = "(max-width: 640px)";
const subscribeNarrow = (cb: () => void) => {
  const media = window.matchMedia(NARROW);
  media.addEventListener("change", cb);
  return () => media.removeEventListener("change", cb);
};
function useNarrow() {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

// Tres filas de ocho portadas.
const PAGE = 24;
const LAYOUT_KEY = "archivario-library-layout";
type Layout = "grid" | "list";
// Preferencia de este navegador; sin almacenamiento se usan las portadas.
function savedLayout(): Layout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

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
  onTonight,
  onPriority,
  onStopSession,
  onReleaseDates,
  request,
  onYear,
  onEditActivity,
  onJournal,
  onView,
  onBulkLink,
  onImport,
  demo,
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
  onTonight: () => void;
  onPriority: () => void;
  onStopSession: () => void;
  onReleaseDates: (items: ReleaseUpdate[]) => void;
  request: ApiRequest;
  onYear: () => void;
  onEditActivity: (a: Activity) => void;
  onJournal: () => void;
  onView: (view: string) => void;
  onBulkLink: () => void;
  onImport: (source: "steam" | "csv") => void;
  demo: boolean;
}) {
  const unlinked = state.games.filter((g) => !g.catalogId).length;
  const { filters: f, set, reset, page, setPage } = filterState;
  const { filtered, runOf } = useFilteredGames(state, f, view);
  const [showFilters, setShowFilters] = useState(false),
    [moreOpen, setMoreOpen] = useState(false),
    [viewName, setViewName] = useState<string>();
  const narrow = useNarrow();
  const views = state.profile.views ?? [];
  const backlog = useMemo(
    () => backlogHours(state, f.timeMode),
    [state, f.timeMode],
  );
  const activeFilters = countActiveFilters(f, view);
  const defaults = viewDefaults(view);
  // Filtros que quedan tras «Más filtros»: si hay alguno puesto, se enseñan.
  const secondaryActive = (
    [
      "timeMode",
      "ownership",
      "ratingFilter",
      "tag",
      "format",
      "recommendedBy",
      "searchSpoilers",
    ] as const
  ).filter((key) => f[key] !== defaults[key]).length;
  const clearAll = () =>
    reset({ ownership: defaults.ownership, sort: defaults.sort });
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
  const tags = useMemo(() => allTags(state), [state]);
  const friends = useMemo(() => recommenders(state), [state]);
  const [layout, setLayout] = useState<Layout>(savedLayout);
  const chooseLayout = (next: Layout) => {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      // Sin almacenamiento la elección dura esta visita.
    }
  };
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
  const itemProps = (g: Game) => {
    const r = runOf(g)!;
    return {
      game: g,
      run: r,
      hours: estimatedHours(g, f.timeMode),
      showCritic: f.showCritic,
      playedToday: playedToday.has(g.id),
      busy,
      selecting,
      selected: selectedIds.includes(g.id),
      onSelect: (checked: boolean) =>
        setSelectedIds((ids) =>
          checked ? [...ids, g.id] : ids.filter((id) => id !== g.id),
        ),
      onOpen: () => onGame(g.id),
      onFavorite: () =>
        run({ type: "save-game", game: { ...g, favorite: !g.favorite } }),
      onStatus: (status: Run["status"]) =>
        run({
          type: "save-run",
          run: changeRunStatus(r, status, today),
          primary: true,
        }),
      onToday: () => markToday(g),
    };
  };
  const layoutToggle = (
    <div
      className="segmented layout-toggle"
      role="group"
      aria-label="Cómo ver los juegos"
    >
      {(
        [
          ["grid", "Portadas", LayoutGrid],
          ["list", "Lista", List],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={layout === value}
          className={layout === value ? "selected" : ""}
          onClick={() => chooseLayout(value)}
        >
          <Icon size={15} aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  );
  const sortSelect = (
    <select
      aria-label="Ordenar biblioteca"
      value={f.sort}
      onChange={(e) => set("sort", e.target.value as GameSort)}
    >
      <option value="recent">Última actividad</option>
      <option value="title">Título A–Z</option>
      <option value="rating">Mi nota: mayor primero</option>
      <option value="critic">Crítica: mayor primero</option>
      <option value="shortest">Duración: más cortos primero</option>
      {view === "Próximos" && (
        <option value="priority">Mi orden de prioridad</option>
      )}
    </select>
  );
  if (!state.games.length)
    return (
      <Welcome
        demo={demo}
        onImport={onImport}
        onAdd={onAdd}
        onSagas={onSagas}
      />
    );
  return (
    <>
      <div
        className="library-views"
        role="group"
        aria-label="Vista de la biblioteca"
      >
        {["Biblioteca", "Favoritos", "Próximos"].map((name) => (
          <button
            key={name}
            aria-pressed={view === name}
            className={view === name ? "selected" : ""}
            onClick={() => onView(name)}
          >
            {name === "Biblioteca" ? "Todos" : name}
          </button>
        ))}
      </div>
      <div className="library-shortcuts">
        <Button variant="ghost" size="sm" onClick={onTonight}>
          <Moon size={15} /> ¿A qué juego esta noche?
        </Button>
        {view === "Próximos" && (
          <Button variant="ghost" size="sm" onClick={onPriority}>
            <ListOrdered size={15} /> Ordenar prioridad
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onSagas}>
          <Layers3 size={15} /> Mis sagas ({state.sagas?.length ?? 0})
        </Button>
        <Button variant="ghost" size="sm" onClick={onPlanning}>
          <ListChecks size={15} /> Listas y planes
        </Button>
        {!demo && unlinked > 0 && (
          <Button variant="ghost" size="sm" onClick={onBulkLink}>
            <Link2 size={15} /> Completar fichas ({unlinked})
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onYear}>
          <CalendarRange size={15} /> Mi resumen anual
        </Button>
      </div>
      {view === "Biblioteca" && (
        <NowPlaying
          state={state}
          playedToday={playedToday}
          busy={busy}
          execute={execute}
          onStopSession={onStopSession}
          onGame={onGame}
          onToday={markToday}
          onResume={(g) => {
            const r = runOf(g);
            if (r)
              run({
                type: "save-run",
                run: changeRunStatus(r, "jugando", today),
                primary: true,
              });
          }}
        />
      )}
      {view === "Próximos" && (
        <UpcomingReleases
          state={state}
          today={today}
          request={request}
          demo={demo}
          onUpdate={onReleaseDates}
          onGame={onGame}
        />
      )}
      {view === "Próximos" && backlog.games > 0 && (
        <p className="backlog-note">
          Tienes{" "}
          <strong>
            {backlog.games === 1
              ? "1 juego pendiente"
              : backlog.games + " juegos pendientes"}
          </strong>
          {backlog.hours > 0 && (
            <>
              : unas <strong>{formatHours(backlog.hours)}</strong> de{" "}
              {timeLabels[f.timeMode].toLocaleLowerCase("es")}
            </>
          )}
          {backlog.unknown > 0 &&
            " (" +
              (backlog.unknown === 1
                ? "1 sin duración conocida"
                : backlog.unknown + " sin duración conocida") +
              ")"}
          . Sin prisa.
        </p>
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
        </div>
        <div className="library-tool-buttons">
          <Button
            variant="secondary"
            aria-expanded={showFilters}
            aria-controls="library-filters"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} /> Filtros
            {activeFilters > 0 && (
              <span className="filter-count">{activeFilters}</span>
            )}
          </Button>
          <Button
            variant="secondary"
            aria-pressed={selecting}
            onClick={() => {
              setSelecting(!selecting);
              setSelectedIds([]);
            }}
          >
            <ListChecks size={16} aria-hidden="true" />
            <span className="tool-label">
              {selecting ? "Terminar selección" : "Seleccionar juegos"}
            </span>
          </Button>
        </div>
      </div>
      {showFilters && (
        <section
          id="library-filters"
          className="filter-panel"
          aria-label="Filtros de la biblioteca"
        >
          <label>
            Plataforma
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
          </label>
          <label>
            Género
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
          </label>
          <label>
            Duración
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
          </label>
          {narrow && (
            <div className="filter-sort">
              <label>
                Orden
                {sortSelect}
              </label>
              {layoutToggle}
            </div>
          )}
          {(moreOpen || secondaryActive > 0) && (
            <div className="filter-more" id="library-more-filters">
              <label>
                Medir duración por
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
              </label>
              <label>
                Disponibilidad
                <select
                  aria-label="Disponibilidad de los juegos"
                  value={f.ownership}
                  onChange={(e) => set("ownership", e.target.value)}
                >
                  <option value="owned">Mi biblioteca</option>
                  <option value="wishlist">Lista de deseos</option>
                  <option value="all">Biblioteca y deseos</option>
                </select>
              </label>
              <label>
                Valoración
                <select
                  aria-label="Filtrar por valoración"
                  value={f.ratingFilter}
                  onChange={(e) => set("ratingFilter", e.target.value)}
                >
                  <option value="all">Todas las valoraciones</option>
                  <option value="unrated">Sin valorar</option>
                  <option value="unreviewed">Sin reseña</option>
                </select>
              </label>
              {tags.length > 0 && (
                <label>
                  Etiqueta
                  <select
                    aria-label="Filtrar por etiqueta"
                    value={f.tag}
                    onChange={(e) => set("tag", e.target.value)}
                  >
                    <option value="">Todas las etiquetas</option>
                    {tags.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.count})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Cómo lo tienes
                <select
                  aria-label="Filtrar por formato"
                  value={f.format}
                  onChange={(e) => set("format", e.target.value)}
                >
                  <option value="">Cualquier formato</option>
                  {formats.map((x) => (
                    <option key={x} value={x}>
                      {formatLabels[x]}
                    </option>
                  ))}
                  <option value="sin indicar">Sin indicar</option>
                </select>
              </label>
              {friends.length > 0 && (
                <label>
                  Recomendado por
                  <select
                    aria-label="Filtrar por quién lo recomendó"
                    value={f.recommendedBy}
                    onChange={(e) => set("recommendedBy", e.target.value)}
                  >
                    <option value="">Cualquiera</option>
                    {friends.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={f.showCritic}
                  onChange={(e) => set("showCritic", e.target.checked)}
                />{" "}
                Mostrar la nota de la crítica
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={f.searchSpoilers}
                  onChange={(e) => set("searchSpoilers", e.target.checked)}
                />{" "}
                Buscar también en spoilers
              </label>
            </div>
          )}
          <div className="filter-actions">
            {secondaryActive === 0 && (
              <Button
                variant="ghost"
                aria-expanded={moreOpen}
                aria-controls="library-more-filters"
                onClick={() => setMoreOpen(!moreOpen)}
              >
                {moreOpen ? "Menos filtros" : "Más filtros"}
              </Button>
            )}
            {viewName === undefined ? (
              <Button
                variant="ghost"
                disabled={!Object.keys(viewFilters(f)).length}
                onClick={() => setViewName("")}
              >
                <Save size={15} /> Guardar como vista
              </Button>
            ) : (
              <form
                className="save-view"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await run({
                    type: "save-view",
                    view: {
                      id: crypto.randomUUID(),
                      name: viewName.trim(),
                      filters: viewFilters(f),
                    },
                  });
                  setViewName(undefined);
                }}
              >
                <label>
                  <span className="sr-only">Nombre de la vista</span>
                  <input
                    autoFocus
                    required
                    maxLength={40}
                    placeholder="Nombre: «Cortos en Switch»"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                  />
                </label>
                <Button size="sm" disabled={busy || !viewName.trim()}>
                  Guardar vista
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => setViewName(undefined)}
                >
                  Cancelar
                </Button>
              </form>
            )}
            <Button
              variant="ghost"
              onClick={clearAll}
              disabled={activeFilters === 0 && f.sort === "recent" && !f.query}
            >
              Limpiar filtros
            </Button>
          </div>
        </section>
      )}
      {views.length > 0 && (
        <div className="saved-views" role="group" aria-label="Vistas guardadas">
          {views.map((v) => (
            <span key={v.id}>
              <button
                onClick={() => reset({ ...defaults, ...filtersOfView(v) })}
              >
                {v.name}
              </button>
              <button
                aria-label={"Quitar la vista " + v.name}
                onClick={() => run({ type: "delete-view", id: v.id })}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="status-row">
        <span className="muted text-xs result-count" role="status">
          {filtered.length} juegos
        </span>
        <div className="status-tabs">
          {["Todos", ...statuses].map((s) => (
            <button
              key={s}
              aria-pressed={f.status === s}
              className={f.status === s ? "selected" : ""}
              onClick={() => set("status", s)}
            >
              {s === "Todos" ? "Todos" : statusLabel(s)}
              {s === "Todos" && <span>{state.games.length}</span>}
            </button>
          ))}
        </div>
        {!narrow && layoutToggle}
        {!narrow && sortSelect}
      </div>
      {(f.tag || f.recommendedBy || f.format) && (
        <div className="active-filters" aria-label="Filtros activos">
          {(
            [
              ["tag", "Etiqueta"],
              ["recommendedBy", "Recomendado por"],
              ["format", "Cómo lo tienes"],
            ] as const
          )
            .filter(([key]) => f[key])
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => set(key, "")}
                aria-label={"Quitar el filtro " + label + ": " + f[key]}
              >
                {label}:{" "}
                <strong>
                  {key === "format" && f.format !== "sin indicar"
                    ? formatLabels[f.format as Format]
                    : f[key]}
                </strong>{" "}
                <X size={13} aria-hidden="true" />
              </button>
            ))}
        </div>
      )}
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
        layout === "list" ? (
          <ul className="game-list" aria-label="Juegos">
            {visible.map((g) => (
              <GameRow key={g.id} {...itemProps(g)} />
            ))}
          </ul>
        ) : (
          <div className="game-grid">
            {visible.map((g) => (
              <GameCard key={g.id} {...itemProps(g)} timeMode={f.timeMode} />
            ))}
          </div>
        )
      ) : (
        <div className="empty-state">
          <BookOpen size={36} />
          {state.games.length &&
          (f.query.trim() || activeFilters > 0 || f.status !== "Todos") ? (
            <>
              <h2>
                {f.query.trim()
                  ? "Nada coincide con «" + f.query.trim() + "»."
                  : "Ningún juego con estos filtros."}
              </h2>
              <p>Prueba con otras palabras o quita algún filtro.</p>
              <Button variant="secondary" onClick={clearAll}>
                Quitar búsqueda y filtros
              </Button>
            </>
          ) : (
            <>
              <h2>
                {state.games.length
                  ? "Aquí todavía no hay juegos."
                  : "Tu biblioteca empieza con un juego."}
              </h2>
              <p>
                {state.games.length
                  ? view === "Favoritos"
                    ? "Marca un juego con el corazón para verlo aquí."
                    : "Marca juegos como próximos o pendientes para verlos aquí."
                  : "Busca en el catálogo o añade tu primer juego manualmente."}
              </p>
              <Button variant="secondary" onClick={onAdd}>
                Añadir juego
              </Button>
            </>
          )}
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
      {view === "Biblioteca" && (
        <OnThisDay state={state} today={today} onEdit={onEditActivity} />
      )}
      <div className="dashboard-bottom">
        <Recent state={state} onEdit={onEditActivity} onAll={onJournal} />
        <MonthCard state={state} today={today} />
      </div>
    </>
  );
}
