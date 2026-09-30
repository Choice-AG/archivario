"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  BookOpen,
  CalendarDays,
  Check,
  Gamepad2,
  Heart,
  Layers3,
  LogOut,
  NotebookPen,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { configured, clientAuth } from "@/features/account/firebase-client";
import { useLibrary } from "./use-library";
import { dateInZone, type Activity } from "../domain/model";
import { CatalogGamePage } from "./catalog-game-page";
import { GlobalSearch } from "./library-improvements";
import { DayActivity } from "./day-activity";
import { Sagas } from "./sagas";
import { GamePage } from "./game-page";
import { BulkActivity } from "./bulk-activity";
import { Planning } from "./planning";
import { YearReview } from "./year-review";
import { AddGame, SettingsPanel } from "./forms";
import { Login } from "./login";
import { CalendarView, Recent } from "./journal";
import { LibraryView } from "./library-view";
import { useLibraryFilters } from "./library-filters";
import { Modal, type Execute } from "./shared";

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

type ModalState = {
  kind: "add" | "activity" | "settings" | "year" | "planning" | "bulk";
  id?: string;
  activity?: Activity;
  date?: string;
} | null;

const nav = [
  { name: "Biblioteca", icon: BookOpen },
  { name: "Sagas", icon: Layers3 },
  { name: "Diario", icon: NotebookPen },
  { name: "Calendario", icon: CalendarDays },
  { name: "Favoritos", icon: Heart },
  { name: "Próximos", icon: Sparkles },
];

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
  const [gameId, setGameId] = useState(initialGameId),
    [sagaId, setSagaId] = useState(initialSagaId),
    [view, setView] = useState(initialView ?? "Biblioteca"),
    [modal, setModal] = useState<ModalState>(null),
    [notice, setNotice] = useState("");
  // Vista desde la que se abrió una ficha del catálogo, para volver a ella.
  const [origin, setOrigin] = useState<{ view: string; sagaId?: string }>({
    view: initialSagaId !== undefined ? "Sagas" : "Biblioteca",
    sagaId: initialSagaId,
  });
  const filterState = useLibraryFilters();
  const api = useLibrary(user),
    { state, execute, ready, busy, error, setError } = api;
  const today = dateInZone(new Date(), state.profile.timezone),
    [month, setMonth] = useState(today.slice(0, 7));
  const suffix = user ? "" : "?demo=1";

  const openSaga = (id?: string) => {
    window.history.pushState(
      {},
      "",
      "/sagas" + (id ? "/" + encodeURIComponent(id) : "") + suffix,
    );
    setSagaId(id);
    setGameId(undefined);
    setView("Sagas");
    setModal(null);
    window.scrollTo(0, 0);
  };
  const openGame = (id: string) => {
    if (!gameId) setOrigin({ view, sagaId });
    window.history.pushState(
      {},
      "",
      "/juegos/" + encodeURIComponent(id) + suffix,
    );
    setGameId(id);
    setModal(null);
    window.scrollTo(0, 0);
  };
  const backToLibrary = () => {
    window.history.pushState({}, "", "/" + suffix);
    setGameId(undefined);
    setView("Biblioteca");
    setSagaId(undefined);
    setModal(null);
  };
  const backFromGame = () => {
    if (origin.view === "Sagas") openSaga(origin.sagaId);
    else {
      backToLibrary();
      setView(origin.view);
    }
  };
  const goTo = (name: string) => {
    if (name === "Sagas") {
      openSaga();
      return;
    }
    if (gameId || view === "Sagas") backToLibrary();
    setView(name);
    filterState.setPage(1);
    if (name === "Próximos") filterState.reset({ ownership: "all" });
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
  useEffect(() => {
    if (gameId) document.querySelector<HTMLElement>(".game-hero h1")?.focus();
  }, [gameId]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const safeExecute: Execute = async (c) => {
    await execute(c);
    setNotice(
      c.type === "save-saga"
        ? "Guía guardada en Sagas → Mis sagas" +
            (user ? "" : " · Solo en este navegador")
        : "Guardado en " + (user ? "tu biblioteca" : "la demostración local"),
    );
  };
  if (!ready) return <div className="loading">Abriendo tu biblioteca…</div>;
  const ownedGame = gameId
    ? state.games.find((g) => g.id === gameId)
    : undefined;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            goTo("Biblioteca");
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
              aria-current={view === n.name ? "page" : undefined}
              onClick={() => goTo(n.name)}
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
                onBack={backFromGame}
                backLabel={
                  origin.view === "Sagas"
                    ? "Volver a Sagas"
                    : "Volver a la biblioteca"
                }
              />
            ) : ownedGame &&
              state.runs.some((r) => r.id === ownedGame.primaryRunId) ? (
              <GamePage
                onGame={openGame}
                key={gameId}
                game={ownedGame}
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
                <LibraryView
                  state={state}
                  view={view}
                  today={today}
                  busy={busy}
                  filterState={filterState}
                  execute={safeExecute}
                  onNotice={setNotice}
                  onGame={openGame}
                  onSagas={() => openSaga()}
                  onAdd={() => setModal({ kind: "add" })}
                  onPlanning={() => setModal({ kind: "planning" })}
                  onYear={() => setModal({ kind: "year" })}
                  onActivity={(id) =>
                    setModal({ kind: "activity", id, date: today })
                  }
                  onEditActivity={(a) =>
                    setModal({ kind: "activity", activity: a })
                  }
                  onJournal={() => setView("Diario")}
                />
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
                <CalendarView
                  state={state}
                  today={today}
                  month={month}
                  onMonth={setMonth}
                  onDay={(date) => setModal({ kind: "activity", date })}
                  onBulk={() => setModal({ kind: "bulk" })}
                />
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
            aria-current={view === n.name ? "page" : undefined}
            key={n.name}
            onClick={() => goTo(n.name)}
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
          <Planning state={state} execute={safeExecute} onGame={openGame} />
        </Modal>
      )}
      {modal?.kind === "year" && (
        <Modal
          title="Tu año en juegos"
          description="Un vistazo a los mundos que has visitado."
          onClose={() => setModal(null)}
        >
          <YearReview state={state} today={today} onGame={openGame} />
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
