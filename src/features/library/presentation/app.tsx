"use client";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import {
  BookOpen,
  CalendarDays,
  Gamepad2,
  Heart,
  Plus,
  Search,
  Settings,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Layers3,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { configured, clientAuth } from "@/features/account/firebase-client";
import { useLibrary } from "./use-library";
import {
  activityId,
  dateInZone,
  monthlySummary,
  statuses,
  type Activity,
  type Game,
  type Library,
  type Run,
  type Command,
} from "../domain/model";
import { sortGames } from "../domain/insights";
import { CatalogGamePage } from "./catalog-game-page";
import {
  GlobalSearch,
  ContinuePlaying,
  BatchLibrary,
} from "./library-improvements";
import { DayActivity } from "./day-activity";
import { Sagas } from "./sagas";
import { GamePage } from "./game-page";
import { BulkActivity } from "./bulk-activity";
import {
  changeRunStatus,
  estimatedHours,
  formatHours,
  matchesGame,
  timeLabels,
  type TimeMode,
} from "../domain/daily";
import { Planning } from "./planning";
import { YearReview } from "./year-review";
import { AddGame, GameDetails, ActivityForm, SettingsPanel } from "./forms";

export type Execute = (command: Command) => Promise<void>;
export type ApiRequest = (url: string, init?: RequestInit) => Promise<Response>;
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle className="text-2xl font-semibold tracking-tight pr-8">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-2 mb-6 text-sm text-slate-400">
          {description ?? "Tu biblioteca personal, a tu ritmo."}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function Cover({
  game,
  className = "",
}: {
  game: Game;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return game.cover && !failed ? (
    <img
      src={game.cover}
      alt={game.title}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className={"cover-fallback " + className}>
      <Gamepad2 size={44} />
      <span>{game.title}</span>
    </div>
  );
}
export function ArchivarioApp({
  initialGameId,
  initialSagaId,
  initialView,
}: {
  initialGameId?: string;
  initialSagaId?: string;
  initialView?: string;
} = {}) {
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(!configured),
    [demo, setDemo] = useState(!configured);
  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(clientAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) setDemo(false);
    });
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") === "1")
      setDemo(true);
  }, []);
  if (!authReady)
    return <div className="loading">Preparando tu biblioteca…</div>;
  if (!user && !demo) return <Login onDemo={() => setDemo(true)} />;
  return (
    <Dashboard
      initialSagaId={initialSagaId}
      initialView={initialView}
      initialGameId={initialGameId}
      key={user?.uid ?? "demo"}
      user={user}
      onLogin={() => setDemo(false)}
    />
  );
}
function Login({ onDemo }: { onDemo: () => void }) {
  const [signup, setSignup] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <main className="login-screen">
      <div className="login-art">
        <Gamepad2 size={60} />
        <h1>
          Mil historias.
          <br />
          <span>Tu propia partida.</span>
        </h1>
        <p>
          Un lugar para los mundos que visitas
          <br />y los que todavía te esperan.
        </p>
      </div>
      <section className="login-form">
        <div className="brand">
          <Gamepad2 /> Archivario
        </div>
        <h2>
          {signup
            ? "Tu próximo viaje empieza aquí."
            : "Qué bien volver a verte."}
        </h2>
        <p className="muted">Una biblioteca privada. Todos tus dispositivos.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setMessage("");
            const f = new FormData(e.currentTarget);
            try {
              if (signup)
                await createUserWithEmailAndPassword(
                  clientAuth(),
                  String(f.get("email")),
                  String(f.get("password")),
                );
              else
                await signInWithEmailAndPassword(
                  clientAuth(),
                  String(f.get("email")),
                  String(f.get("password")),
                );
            } catch {
              setMessage(
                "No se ha podido acceder. Revisa tus datos y la configuración de Firebase.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Correo electrónico
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete={signup ? "new-password" : "current-password"}
              required
            />
          </label>
          <Button disabled={pending} className="w-full">
            {signup ? "Crear cuenta" : "Entrar"}
          </Button>
        </form>
        <p role="status" className="muted">
          {message}
        </p>
        <Button variant="ghost" onClick={() => setSignup(!signup)}>
          {signup ? "Ya tengo cuenta" : "Crear una cuenta"}
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            const email = (
              document.querySelector('[name="email"]') as HTMLInputElement
            )?.value;
            if (!email) {
              setMessage("Escribe tu correo en el formulario.");
              return;
            }
            try {
              await sendPasswordResetEmail(clientAuth(), email);
              setMessage(
                "Si existe una cuenta, recibirás instrucciones por correo.",
              );
            } catch {
              setMessage("No se ha podido enviar el correo.");
            }
          }}
        >
          Recuperar contraseña
        </Button>
        <div className="divider" />
        <Button variant="secondary" onClick={onDemo}>
          Explorar la demostración <ArrowUpRight size={16} />
        </Button>
      </section>
    </main>
  );
}

function Dashboard({
  user,
  onLogin,
  initialGameId,
  initialSagaId,
  initialView,
}: {
  user: User | null;
  onLogin: () => void;
  initialGameId?: string;
  initialSagaId?: string;
  initialView?: string;
}) {
  const [gameId, setGameId] = useState(initialGameId);
  const [sagaId, setSagaId] = useState(initialSagaId);
  const openSaga = (id?: string) => {
    window.history.pushState(
      {},
      "",
      "/sagas" +
        (id ? "/" + encodeURIComponent(id) : "") +
        (user ? "" : "?demo=1"),
    );
    setSagaId(id);
    setGameId(undefined);
    setView("Sagas");
    setModal(null);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const read = () => {
      const match = window.location.pathname.match(/^\/juegos\/([^/]+)\/?$/);
      setGameId(match ? decodeURIComponent(match[1]) : undefined);
      const saga = window.location.pathname.match(/^\/sagas(?:\/([^/]+))?\/?$/);
      setSagaId(saga?.[1] ? decodeURIComponent(saga[1]) : undefined);
      setView(saga ? "Sagas" : "Biblioteca");
      setModal(null);
    };
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const openGame = (id: string) => {
    window.history.pushState(
      {},
      "",
      "/juegos/" + encodeURIComponent(id) + (user ? "" : "?demo=1"),
    );
    setGameId(id);
    setModal(null);
    window.scrollTo(0, 0);
  };
  const backToLibrary = () => {
    window.history.pushState({}, "", "/" + (user ? "" : "?demo=1"));
    setGameId(undefined);
    setView("Biblioteca");
    setSagaId(undefined);
    setModal(null);
  };
  useEffect(() => {
    if (gameId) document.querySelector<HTMLElement>(".game-hero h1")?.focus();
  }, [gameId]);
  const api = useLibrary(user),
    { state, execute, ready, busy, error, setError } = api;
  const [view, setView] = useState(initialView ?? "Biblioteca"),
    [status, setStatus] = useState("Todos"),
    [query, setQuery] = useState(""),
    [platform, setPlatform] = useState("Todas"),
    [genre, setGenre] = useState("Todos"),
    [duration, setDuration] = useState("Cualquiera"),
    [timeMode, setTimeMode] = useState<TimeMode>("main"),
    [searchSpoilers, setSearchSpoilers] = useState(false),
    [ownership, setOwnership] = useState("owned"),
    [ratingFilter, setRatingFilter] = useState("all"),
    [sort, setSort] = useState("recent"),
    [page, setPage] = useState(1);
  const [modal, setModal] = useState<{
    kind:
      "add" | "game" | "activity" | "settings" | "year" | "planning" | "bulk";
    id?: string;
    activity?: Activity;
    date?: string;
  } | null>(null);
  const [selecting, setSelecting] = useState(false),
    [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const today = dateInZone(new Date(), state.profile.timezone),
    [month, setMonth] = useState(today.slice(0, 7));
  useEffect(() => {
    setPage(1);
  }, [
    query,
    status,
    platform,
    genre,
    duration,
    timeMode,
    searchSpoilers,
    ratingFilter,
    ownership,
    sort,
    view,
  ]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const run = (g: Game) => state.runs.find((r) => r.id === g.primaryRunId)!;
  const filtered = sortGames(
    state.games
      .filter(
        (g) =>
          (status === "Todos" || run(g).status === status) &&
          matchesGame(state, g, query, searchSpoilers) &&
          (platform === "Todas" || g.platforms.includes(platform)) &&
          (genre === "Todos" || g.genres.includes(genre)) &&
          (duration === "Cualquiera" ||
            (estimatedHours(g, timeMode) !== undefined &&
              (duration === "short"
                ? estimatedHours(g, timeMode)! <= 10
                : duration === "medium"
                  ? estimatedHours(g, timeMode)! > 10 &&
                    estimatedHours(g, timeMode)! <= 30
                  : estimatedHours(g, timeMode)! > 30))) &&
          (view !== "Favoritos" || g.favorite) &&
          (view !== "Próximos" || g.next || run(g).status === "pendiente"),
      )
      .filter(
        (g) =>
          ownership === "all" ||
          (ownership === "wishlist" ? g.wishlist : !g.wishlist),
      )
      .filter(
        (g) =>
          ratingFilter === "all" ||
          (ratingFilter === "unrated"
            ? g.rating === undefined
            : !g.review.trim()),
      ),
    state,
    sort,
    timeMode,
  );
  const summary = monthlySummary(state, month);
  const safeExecute: Execute = async (c) => {
    await execute(c);
    setNotice(
      c.type === "save-saga"
        ? "Guía guardada en Sagas → Mis sagas" +
            (user ? "" : " · Solo en este navegador")
        : "Guardado en " + (user ? "tu biblioteca" : "la demostración local"),
    );
  };
  const quickStatus = async (g: Game, status: Run["status"]) => {
    try {
      await safeExecute({
        type: "save-run",
        run: changeRunStatus(run(g), status, today),
        primary: true,
      });
    } catch {}
  };
  const markToday = async (g: Game) => {
    if (state.activities.some((a) => a.id === activityId(g.id, today))) {
      setNotice("Este juego ya está registrado hoy.");
      return;
    }
    try {
      await safeExecute({
        type: "save-activity",
        activity: {
          id: activityId(g.id, today),
          gameId: g.id,
          runId: g.primaryRunId,
          date: today,
          note: "",
        },
      });
    } catch {}
  };
  const nav = [
    { name: "Biblioteca", icon: BookOpen },
    { name: "Sagas", icon: Layers3 },
    { name: "Diario", icon: Layers3 },
    { name: "Calendario", icon: CalendarDays },
    { name: "Favoritos", icon: Heart },
    { name: "Próximos", icon: Sparkles },
  ];
  if (!ready) return <div className="loading">Abriendo tu biblioteca…</div>;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (gameId || view === "Sagas") backToLibrary();
            setView("Biblioteca");
          }}
        >
          <Gamepad2 size={30} /> Archivario
          <span className="brand-dot" />
        </a>
        <p className="nav-label">TU ESPACIO</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.name}
              className={view === n.name ? "active" : ""}
              onClick={() => {
                if (n.name === "Sagas") {
                  openSaga();
                  return;
                }
                if (gameId || view === "Sagas") backToLibrary();
                setView(n.name);
                if (n.name === "Próximos") {
                  setStatus("Todos");
                  setOwnership("all");
                  setQuery("");
                  setPlatform("Todas");
                  setGenre("Todos");
                  setDuration("Cualquiera");
                  setRatingFilter("all");
                }
              }}
            >
              <n.icon size={19} />
              {n.name}
              {n.name === "Biblioteca" && (
                <span className="nav-count">{state.games.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <span>
              Sin prisa.
              <br />
              Sin partidas pendientes.
            </span>
            <p>Solo historias por vivir.</p>
            <Sparkles size={20} />
          </div>
          <button
            className="profile-button"
            onClick={() => setModal({ kind: "settings" })}
          >
            <span className="avatar" aria-hidden="true">
              {(state.profile.name || "A").slice(0, 1).toLocaleUpperCase("es")}
            </span>
            <span>
              <strong>{state.profile.name || "Mi perfil"}</strong>
              <small>
                {user ? "Espacio privado" : "Perfil de demostración"}
              </small>
            </span>
            <Settings size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumbs">
            Mi espacio <span>/</span> <strong>{view}</strong>
          </span>
          <div className="top-actions">
            <GlobalSearch
              state={state}
              request={api.request}
              demo={!user}
              onGame={openGame}
              onSaga={openSaga}
            />
            <span className="private-label">
              <ShieldCheck size={14} /> Privado
            </span>
            <button
              className="mobile-settings"
              aria-label="Ajustes"
              onClick={() => setModal({ kind: "settings" })}
            >
              <Settings size={20} />
            </button>
            {user ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => signOut(clientAuth())}
              >
                <LogOut size={16} />
                <span>Salir</span>
              </Button>
            ) : configured ? (
              <Button size="sm" variant="secondary" onClick={onLogin}>
                Iniciar sesión
              </Button>
            ) : (
              <span className="demo-chip">DEMO LOCAL</span>
            )}
          </div>
        </header>
        <main id="main-content">
          {!user && (
            <div className="demo-banner">
              <span className="demo-dot" /> Estás explorando una demostración.
              Los cambios se guardan solo en este navegador.
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError("");
                  api.reload().catch((e) => setError(e.message));
                }}
              >
                Reintentar
              </Button>
            </div>
          )}
          {api.canUndo && (
            <div className="undo-bar">
              <span>
                Último cambio guardado. Puedes deshacerlo antes de otra edición
                o de recargar.
              </span>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  try {
                    await api.undo();
                    setModal(null);
                    setNotice("Último cambio deshecho.");
                  } catch {}
                }}
              >
                Deshacer último cambio
              </Button>
            </div>
          )}
          {view === "Sagas" && !gameId ? (
            <Sagas
              state={state}
              request={api.request}
              execute={safeExecute}
              demo={!user}
              selectedId={sagaId}
              onSelect={openSaga}
              onGame={openGame}
            />
          ) : gameId ? (
            /^igdb-[1-9]\d*$/.test(gameId) ? (
              <CatalogGamePage
                key={gameId}
                id={Number(gameId.slice(5))}
                state={state}
                request={api.request}
                execute={safeExecute}
                demo={!user}
                onGame={openGame}
                onBack={() => openSaga(sagaId)}
              />
            ) : state.games.find((g) => g.id === gameId) ? (
              <GamePage
                onGame={openGame}
                key={gameId}
                game={state.games.find((g) => g.id === gameId)!}
                state={state}
                request={api.request}
                execute={safeExecute}
                demo={!user}
                today={today}
                onBack={backToLibrary}
                onActivity={() =>
                  setModal({ kind: "activity", id: gameId, date: today })
                }
              />
            ) : (
              <section className="empty-state">
                <h1>Juego no encontrado en tu biblioteca</h1>
                <Button onClick={backToLibrary}>Volver a la biblioteca</Button>
              </section>
            )
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">
                    {view === "Biblioteca"
                      ? "CADA JUEGO, UNA HISTORIA"
                      : view === "Calendario"
                        ? "UN DÍA, UN NUEVO RECUERDO"
                        : "TUS JUEGOS, A TU RITMO"}
                  </p>
                  <h1>
                    {view === "Biblioteca"
                      ? "Tu próxima aventura empieza aquí."
                      : view === "Diario"
                        ? "Lo que has estado jugando."
                        : view === "Calendario"
                          ? "Tu calendario de aventuras."
                          : view === "Favoritos"
                            ? "Los que se quedan contigo."
                            : "Un pequeño horizonte."}
                  </h1>
                  <p>
                    {view === "Próximos"
                      ? "Todos tus juegos pendientes y tus próximos favoritos. Sin fechas límite."
                      : "Un lugar para volver a tus mundos favoritos."}
                  </p>
                </div>
                <Button onClick={() => setModal({ kind: "add" })}>
                  <Plus size={18} /> Añadir juego
                </Button>
              </section>
              {["Biblioteca", "Favoritos", "Próximos"].includes(view) ? (
                <>
                  {view === "Biblioteca" && (
                    <ContinuePlaying
                      state={state}
                      onGame={openGame}
                      onActivity={(id) =>
                        setModal({ kind: "activity", id, date: today })
                      }
                    />
                  )}
                  <div className="library-tools">
                    <div className="search-field">
                      <Search size={18} />
                      <input
                        aria-label="Buscar en mi biblioteca"
                        placeholder="Buscar títulos, notas y reseñas…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <kbd>⌕</kbd>
                    </div>
                    <div className="filters">
                      <select
                        aria-label="Filtrar por plataforma"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                      >
                        <option value="Todas">Todas las plataformas</option>
                        {[...new Set(state.games.flatMap((g) => g.platforms))]
                          .sort()
                          .map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                      </select>
                      <select
                        aria-label="Filtrar por género"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                      >
                        <option value="Todos">Todos los géneros</option>
                        {[...new Set(state.games.flatMap((g) => g.genres))]
                          .sort()
                          .map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                      </select>
                      <select
                        aria-label="Tipo de duración"
                        value={timeMode}
                        onChange={(e) =>
                          setTimeMode(e.target.value as TimeMode)
                        }
                      >
                        {Object.entries(timeLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Duración aproximada"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      >
                        <option value="Cualquiera">Cualquier duración</option>
                        <option value="short">Hasta 10 h aprox.</option>
                        <option value="medium">Entre 10 y 30 h aprox.</option>
                        <option value="long">Más de 30 h aprox.</option>
                      </select>
                    </div>
                  </div>
                  <div className="library-extras">
                    <Button variant="secondary" onClick={() => openSaga()}>
                      Mis sagas ({state.sagas?.length ?? 0})
                    </Button>
                    <Button
                      variant="secondary"
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
                        checked={searchSpoilers}
                        onChange={(e) => setSearchSpoilers(e.target.checked)}
                      />{" "}
                      Buscar también en spoilers
                    </label>
                    <select
                      aria-label="Disponibilidad de los juegos"
                      value={ownership}
                      onChange={(e) => setOwnership(e.target.value)}
                    >
                      <option value="owned">Mi biblioteca</option>
                      <option value="wishlist">Lista de deseos</option>
                      <option value="all">Biblioteca y deseos</option>
                    </select>
                    <Button
                      variant="secondary"
                      onClick={() => setModal({ kind: "planning" })}
                    >
                      Listas y planes
                    </Button>
                    <select
                      aria-label="Filtrar por valoración"
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value)}
                    >
                      <option value="all">Todas las valoraciones</option>
                      <option value="unrated">Sin valorar</option>
                      <option value="unreviewed">Sin reseña</option>
                    </select>
                    <Button
                      variant="secondary"
                      onClick={() => setModal({ kind: "year" })}
                    >
                      Mi resumen anual
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setQuery("");
                        setStatus("Todos");
                        setPlatform("Todas");
                        setGenre("Todos");
                        setDuration("Cualquiera");
                        setTimeMode("main");
                        setSearchSpoilers(false);
                        setOwnership("owned");
                        setRatingFilter("all");
                        setSort("recent");
                      }}
                    >
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
                          aria-pressed={status === s}
                          className={status === s ? "selected" : ""}
                          onClick={() => setStatus(s)}
                        >
                          {s === "Todos"
                            ? "Todos"
                            : s[0].toUpperCase() + s.slice(1)}
                          {s === "Todos" && <span>{state.games.length}</span>}
                        </button>
                      ))}
                    </div>
                    <select
                      aria-label="Ordenar biblioteca"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Última actividad</option>
                      <option value="title">Título A–Z</option>
                      <option value="rating">Mi nota: mayor primero</option>
                      <option value="shortest">
                        Duración: más cortos primero
                      </option>
                    </select>
                  </div>
                  {selecting && (
                    <>
                      <div className="form-actions">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setSelectedIds(filtered.map((g) => g.id))
                          }
                        >
                          Seleccionar resultados filtrados
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedIds([])}
                        >
                          Vaciar selección
                        </Button>
                      </div>
                      <BatchLibrary
                        state={state}
                        ids={selectedIds.filter((id) =>
                          state.games.some((g) => g.id === id),
                        )}
                        execute={safeExecute}
                        today={today}
                        onDone={() => setSelectedIds([])}
                      />
                    </>
                  )}
                  {filtered.length ? (
                    <div className="game-grid">
                      {filtered.slice((page - 1) * 12, page * 12).map((g) => (
                        <article className="game-card" key={g.id}>
                          {selecting && (
                            <label className="checkbox-label card-select">
                              <input
                                type="checkbox"
                                aria-label={"Seleccionar " + g.title}
                                checked={selectedIds.includes(g.id)}
                                onChange={(e) =>
                                  setSelectedIds(
                                    e.target.checked
                                      ? [...selectedIds, g.id]
                                      : selectedIds.filter((id) => id !== g.id),
                                  )
                                }
                              />
                              Seleccionar
                            </label>
                          )}
                          <div className="cover-wrap">
                            <button
                              className="cover-link"
                              aria-label={"Abrir " + g.title}
                              onClick={() => openGame(g.id)}
                            >
                              <Cover game={g} />
                            </button>
                            <button
                              className={
                                "favorite-button " +
                                (g.favorite ? "is-favorite" : "")
                              }
                              aria-label={
                                (g.favorite ? "Quitar de" : "Añadir a") +
                                " favoritos: " +
                                g.title
                              }
                              onClick={async () => {
                                try {
                                  await safeExecute({
                                    type: "save-game",
                                    game: { ...g, favorite: !g.favorite },
                                  });
                                } catch {}
                              }}
                            >
                              <Heart
                                size={17}
                                fill={g.favorite ? "currentColor" : "none"}
                              />
                            </button>
                            {g.rating && (
                              <span className="rating">
                                {g.rating.toLocaleString("es")}
                                <small>/10</small>
                              </span>
                            )}
                            {g.next && (
                              <span className="next-badge">
                                <Sparkles size={12} /> Próximamente
                              </span>
                            )}
                          </div>
                          <div className="game-body">
                            <button
                              className="game-title"
                              onClick={() => openGame(g.id)}
                            >
                              {g.title}
                            </button>
                            {g.wishlist && (
                              <small className="wish-label">
                                En tu lista de deseos
                              </small>
                            )}
                            <p className="platform-line">
                              <Gamepad2 size={14} />
                              {g.platforms.join(" · ")}
                              <span>·</span>
                              {g.stores[0] ?? "Sin tienda"}
                            </p>
                            <div className="card-bottom">
                              <span
                                className={
                                  "status-badge status-" +
                                  run(g).status.replace(" ", "-")
                                }
                              >
                                <i />
                                {run(g).status}
                              </span>
                              <span className="game-genre">{g.genres[0]}</span>
                            </div>
                            <label className="quick-status">
                              Estado
                              <select
                                aria-label={"Estado de " + g.title}
                                value={run(g).status}
                                disabled={busy}
                                onChange={(e) =>
                                  quickStatus(
                                    g,
                                    e.target.value as Run["status"],
                                  )
                                }
                              >
                                {statuses.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </label>
                            {["jugando", "en pausa"].includes(
                              run(g).status,
                            ) && (
                              <details className="resume-note">
                                <summary>Retomar partida</summary>
                                <p>
                                  {run(g).whereLeft ||
                                    "Añade una nota en Partidas para recordar dónde lo dejaste."}
                                </p>
                                <button
                                  className="text-link"
                                  onClick={() => openGame(g.id)}
                                >
                                  Abrir partida
                                </button>
                              </details>
                            )}
                            <p className="card-time">
                              {timeLabels[timeMode]}:{" "}
                              {formatHours(estimatedHours(g, timeMode))}
                            </p>
                            <Button
                              variant="secondary"
                              className="w-full today-button"
                              disabled={busy}
                              onClick={() => markToday(g)}
                            >
                              {state.activities.some(
                                (a) => a.id === activityId(g.id, today),
                              ) ? (
                                <>
                                  <Check size={15} /> Registrado hoy
                                </>
                              ) : (
                                <>
                                  <Plus size={15} /> He jugado hoy
                                </>
                              )}
                            </Button>
                          </div>
                        </article>
                      ))}
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
                      <Button
                        variant="secondary"
                        onClick={() => setModal({ kind: "add" })}
                      >
                        Añadir juego
                      </Button>
                    </div>
                  )}
                  {filtered.length > 12 && (
                    <div className="pagination">
                      <Button
                        variant="secondary"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Anterior
                      </Button>
                      <span>
                        {page} / {Math.ceil(filtered.length / 12)}
                      </span>
                      <Button
                        variant="secondary"
                        disabled={page * 12 >= filtered.length}
                        onClick={() => setPage(page + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  )}
                  <div className="dashboard-bottom">
                    <Recent
                      state={state}
                      onEdit={(a) =>
                        setModal({ kind: "activity", activity: a })
                      }
                      onAll={() => setView("Diario")}
                    />
                    <section className="month-card">
                      <p className="eyebrow">PEQUEÑOS GRANDES VIAJES</p>
                      <h2>Tu mes, a tu ritmo.</h2>
                      <p className="muted">
                        {new Intl.DateTimeFormat("es", {
                          month: "long",
                          year: "numeric",
                        }).format(new Date(today + "T12:00:00"))}
                      </p>
                      <div className="summary-grid">
                        <div>
                          <strong>
                            {monthlySummary(state, today.slice(0, 7)).games}
                          </strong>
                          <span>juegos disfrutados</span>
                        </div>
                        <div>
                          <strong>
                            {monthlySummary(state, today.slice(0, 7)).days}
                          </strong>
                          <span>días con actividad</span>
                        </div>
                        <div>
                          <strong>
                            {monthlySummary(state, today.slice(0, 7)).completed}
                          </strong>
                          <span>partidas completadas</span>
                        </div>
                      </div>
                      <p className="month-foot">
                        <Sparkles size={15} /> Cada aventura cuenta, dure lo que
                        dure.
                      </p>
                    </section>
                  </div>
                </>
              ) : view === "Diario" ? (
                <section className="panel">
                  <div className="section-header">
                    <h2>Tu diario</h2>
                    <Button
                      variant="secondary"
                      onClick={() => setModal({ kind: "bulk" })}
                    >
                      Registrar varios días
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setModal({ kind: "activity", date: today })
                      }
                    >
                      <Plus size={16} /> Registrar un día
                    </Button>
                  </div>
                  <Recent
                    state={state}
                    onEdit={(a) => setModal({ kind: "activity", activity: a })}
                    full
                  />
                </section>
              ) : (
                <section className="panel">
                  <div className="section-header">
                    <h2>Calendario</h2>
                    <div className="month-nav">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mes anterior"
                        onClick={() => setMonth(shiftMonth(month, -1))}
                      >
                        <ChevronLeft size={18} />
                      </Button>
                      <input
                        aria-label="Mes del calendario"
                        type="month"
                        value={month}
                        onChange={(e) => {
                          if (e.target.value) setMonth(e.target.value);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mes siguiente"
                        onClick={() => setMonth(shiftMonth(month, 1))}
                      >
                        <ChevronRight size={18} />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setModal({ kind: "bulk" })}
                  >
                    Registrar varios días
                  </Button>
                  <div className="calendar-summary">
                    {summary.games} juegos · {summary.days} días activos ·{" "}
                    {summary.completed} partidas completadas
                  </div>
                  <div className="calendar-grid">
                    {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                      <span className="weekday" key={i}>
                        {d}
                      </span>
                    ))}
                    {Array.from({
                      length:
                        (new Date(month + "-01T12:00:00").getDay() + 6) % 7,
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
                        const date =
                            month + "-" + String(i + 1).padStart(2, "0"),
                          items = state.activities.filter(
                            (a) => a.date === date,
                          );
                        return (
                          <button
                            key={date}
                            className={
                              "calendar-day " + (date === today ? "today" : "")
                            }
                            onClick={() => setModal({ kind: "activity", date })}
                            aria-label={
                              date +
                              (items.length
                                ? ", " + items.length + " juegos"
                                : "")
                            }
                          >
                            <span>{i + 1}</span>
                            {items.slice(0, 3).map((a) => (
                              <small key={a.id}>
                                {
                                  state.games.find((g) => g.id === a.gameId)
                                    ?.title
                                }
                              </small>
                            ))}
                            {items.length > 3 && (
                              <small>+{items.length - 3} más</small>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <p className="muted text-sm mt-5">
                    Las fechas siguen tu zona horaria: {state.profile.timezone}.
                    Toca un día para añadir o editar actividad.
                  </p>
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              Archivario{" "}
              <span className="muted">· Tus juegos, a tu ritmo.</span>
            </span>
            <span>
              <ShieldCheck size={13} /> Solo para ti
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {nav.map((n) => (
          <button
            className={view === n.name ? "active" : ""}
            key={n.name}
            onClick={() => {
              if (n.name === "Sagas") {
                openSaga();
                return;
              }
              if (gameId || view === "Sagas") backToLibrary();
              setView(n.name);
              if (n.name === "Próximos") {
                setStatus("Todos");
                setOwnership("all");
                setQuery("");
                setPlatform("Todas");
                setGenre("Todos");
                setDuration("Cualquiera");
                setRatingFilter("all");
              }
            }}
          >
            <n.icon size={20} />
            {n.name}
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {modal?.kind === "add" && (
        <Modal
          title="Tu próxima aventura"
          description="Busca un juego o añade uno a tu manera."
          onClose={() => setModal(null)}
        >
          <AddGame
            demo={!user}
            state={state}
            execute={safeExecute}
            request={api.request}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === "activity" && (
        <Modal
          title="Tu día de juego"
          description="Todos los juegos de este día, sus partidas y lo que quieras recordar."
          onClose={() => setModal(null)}
        >
          <DayActivity
            state={state}
            initial={modal.activity}
            gameId={modal.id}
            date={modal.date ?? today}
            execute={safeExecute}
            onGame={openGame}
          />
        </Modal>
      )}
      {modal?.kind === "bulk" && (
        <Modal
          title="Registrar varios días"
          description="Selecciona los días en que jugaste."
          onClose={() => setModal(null)}
        >
          <BulkActivity
            state={state}
            today={today}
            execute={safeExecute}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === "planning" && (
        <Modal
          title="Tus listas y próximos planes"
          description="Organiza tus juegos y encuentra tu próxima aventura."
          onClose={() => setModal(null)}
        >
          <Planning
            state={state}
            execute={safeExecute}
            onGame={(id) => openGame(id)}
          />
        </Modal>
      )}
      {modal?.kind === "year" && (
        <Modal
          title="Tu año en juegos"
          description="Un vistazo a los mundos que has visitado."
          onClose={() => setModal(null)}
        >
          <YearReview
            state={state}
            today={today}
            onGame={(id) => openGame(id)}
          />
        </Modal>
      )}
      {modal?.kind === "settings" && (
        <Modal
          title="Tu espacio personal"
          description="Tu perfil y tus notas son privados."
          onClose={() => setModal(null)}
        >
          <SettingsPanel
            state={state}
            execute={safeExecute}
            request={api.request}
            demo={!user}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
function shiftMonth(month: string, n: number) {
  const d = new Date(month + "-15T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function Recent({
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
  const items = [...state.activities].sort((a, b) =>
    b.date.localeCompare(a.date),
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
            const g = state.games.find((g) => g.id === a.gameId)!;
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
