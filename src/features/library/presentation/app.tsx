"use client";
import { Fragment, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
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
  Undo2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { configured, clientAuth } from "@/features/account/firebase-client";
import { useLibrary } from "./use-library";
import { dateInZone, type Activity } from "../domain/model";
import { GlobalSearch } from "./library-improvements";
import { Login } from "./login";
import { VerifyEmailBanner } from "./verify-email";
import { ShortcutList, useShortcuts } from "./shortcuts";
import { clearOfflineData } from "./offline-store";
import { CalendarView, Recent } from "./journal";
import { LibraryView } from "./library-view";
import { useLibraryFilters, viewDefaults } from "./library-filters";
import { Avatar, Modal, type Execute } from "./shared";
import { Onboarding, showOnboarding } from "./onboarding";
import { Celebration, completedBy, type Completion } from "./celebration";
import {
  gamePath,
  parsePath,
  sagaPath,
  settingsPath,
  viewPaths,
} from "./routes";

// Lo que solo se usa al abrir una vista o un modal se descarga bajo demanda,
// para que la primera carga sea más ligera.
function load<P>(loader: () => Promise<React.ComponentType<P>>) {
  return dynamic<P>(loader, {
    loading: () => <p className="loading-inline">Cargando…</p>,
  });
}
const CatalogGamePage = load(() =>
  import("./catalog-game-page").then((m) => m.CatalogGamePage),
);
const DayActivity = load(() =>
  import("./day-activity").then((m) => m.DayActivity),
);
const Sagas = load(() => import("./sagas").then((m) => m.Sagas));
const GamePage = load(() => import("./game-page").then((m) => m.GamePage));
const BulkActivity = load(() =>
  import("./bulk-activity").then((m) => m.BulkActivity),
);
const Planning = load(() => import("./planning").then((m) => m.Planning));
const YearReview = load(() =>
  import("./year-review").then((m) => m.YearReview),
);
const BulkLink = load(() => import("./bulk-link").then((m) => m.BulkLink));
const ImportGames = load(() =>
  import("./import-games").then((m) => m.ImportGames),
);
const AddGame = load(() => import("./add-game").then((m) => m.AddGame));
const ProfilePage = load(() =>
  import("./profile-page").then((m) => m.ProfilePage),
);
const SettingsPage = load(() =>
  import("./settings-page").then((m) => m.SettingsPage),
);

export function ArchivarioApp() {
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(!configured),
    // ?demo=1 abre la demostración aunque Firebase esté configurado.
    [demo, setDemo] = useState(
      () =>
        !configured ||
        (typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("demo") === "1"),
    );
  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(clientAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) setDemo(false);
    });
  }, []);
  if (!authReady)
    return <div className="loading">Preparando tu biblioteca…</div>;
  if (!user && !demo) return <Login onDemo={() => setDemo(true)} />;
  return (
    <Dashboard
      key={user?.uid ?? "demo"}
      user={user}
      onLogin={() => setDemo(false)}
    />
  );
}

type ModalState = {
  kind:
    | "add"
    | "activity"
    | "year"
    | "planning"
    | "bulk"
    | "link"
    | "import"
    | "shortcuts";
  source?: "steam" | "csv";
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
// En móvil, Favoritos y Próximos están como vistas dentro de la biblioteca;
// el perfil se abre desde el avatar de arriba. En medio va el botón de añadir.
const mobileNav = nav.filter((n) =>
  ["Biblioteca", "Sagas", "Diario", "Calendario"].includes(n.name),
);

function Dashboard({
  user,
  onLogin,
}: {
  user: User | null;
  onLogin: () => void;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const { view, gameId, sagaId, settings } = parsePath(pathname);
  const [modal, setModal] = useState<ModalState>(null),
    [notice, setNotice] = useState(""),
    // Juego con el que se abre el diario desde una ficha.
    [journalGame, setJournalGame] = useState<string>();
  // Vista desde la que se abrió una ficha del catálogo, para volver a ella.
  const [origin, setOrigin] = useState<{ view: string; sagaId?: string }>({
    view: sagaId !== undefined ? "Sagas" : "Biblioteca",
    sagaId,
  });
  const filterState = useLibraryFilters();
  const api = useLibrary(user),
    { state, execute, ready, busy, error, setError } = api;
  const today = dateInZone(new Date(), state.profile.timezone),
    [month, setMonth] = useState(today.slice(0, 7));
  const suffix = user ? "" : "?demo=1";
  const mobileActive = (name: string) =>
    view === name ||
    (name === "Biblioteca" && ["Favoritos", "Próximos"].includes(view));

  const navigate = (path: string) => {
    setModal(null);
    router.push(path + suffix);
  };
  const openSaga = (id?: string) => navigate(sagaPath(id));
  const openGame = (id: string) => {
    if (!gameId) setOrigin({ view, sagaId });
    navigate(gamePath(id));
  };
  const backToLibrary = () => navigate("/");
  const backFromGame = () =>
    navigate(
      origin.view === "Sagas"
        ? sagaPath(origin.sagaId)
        : (viewPaths[origin.view] ?? "/"),
    );
  const goTo = (name: string) => {
    setJournalGame(undefined);
    filterState.setPage(1);
    if (name === "Próximos") filterState.reset(viewDefaults("Próximos"));
    navigate(viewPaths[name] ?? "/");
  };
  // Atrás/adelante del navegador también cierra los modales abiertos.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setModal(null);
  }
  useEffect(() => {
    if (gameId) document.querySelector<HTMLElement>(".game-hero h1")?.focus();
  }, [gameId]);
  useEffect(() => {
    if (!notice) return;
    // Tiempo suficiente para pulsar "Deshacer" sin que el aviso estorbe.
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  const [celebrating, setCelebrating] = useState<Completion>();
  const safeExecute: Execute = async (c) => {
    const completed =
      state.profile.celebrate === false ? undefined : completedBy(state, c);
    await execute(c);
    if (completed) {
      // La celebración sustituye a cualquier ventana abierta.
      setModal(null);
      setCelebrating(completed);
    }
    setNotice(
      c.type === "save-saga"
        ? "Guía guardada en Sagas → Mis sagas" +
            (user ? "" : " · Solo en este navegador")
        : "Guardado en " + (user ? "tu biblioteca" : "la demostración local"),
    );
  };
  useShortcuts(ready && !modal, {
    n: () => setModal({ kind: "add" }),
    d: () => setModal({ kind: "activity", date: today }),
    "?": () => setModal({ kind: "shortcuts" }),
    "/": () => {
      const focus = () =>
        document
          .querySelector<HTMLInputElement>(
            '[aria-label="Buscar en mi biblioteca"]',
          )
          ?.focus();
      if (["Biblioteca", "Favoritos", "Próximos"].includes(view) && !gameId)
        focus();
      else {
        goTo("Biblioteca");
        setTimeout(focus, 150);
      }
    },
  });
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
              Sin rachas ni fechas límite.
            </span>
            <p>Solo historias por vivir.</p>
            <Sparkles size={20} />
          </div>
          <button
            className={"profile-button " + (view === "Perfil" ? "active" : "")}
            aria-current={view === "Perfil" ? "page" : undefined}
            onClick={() => goTo("Perfil")}
          >
            <Avatar profile={state.profile} />
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
            {settings && (
              <>
                {" "}
                <span>/</span> <strong>Ajustes</strong>
              </>
            )}
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
              className="mobile-settings mobile-profile"
              aria-label="Perfil"
              aria-current={view === "Perfil" ? "page" : undefined}
              onClick={() => goTo("Perfil")}
            >
              <Avatar profile={state.profile} />
            </button>
            {user ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // La copia local es privada: no se deja en el dispositivo.
                  clearOfflineData(user.uid);
                  signOut(clientAuth());
                }}
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
          {user && <VerifyEmailBanner user={user} />}
          {user && (api.offline || api.pendingSync > 0) && (
            <div className="offline-banner" role="status">
              <WifiOff size={16} aria-hidden="true" />
              {api.offline
                ? "Sin conexión. Puedes seguir usando Archivario: los cambios se guardan en este dispositivo"
                : "Enviando los cambios hechos sin conexión"}
              {api.pendingSync > 0 &&
                " (" +
                  api.pendingSync +
                  (api.pendingSync === 1 ? " pendiente)" : " pendientes)")}
              .
            </div>
          )}
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
          {view === "Perfil" && settings ? (
            <SettingsPage
              state={state}
              execute={safeExecute}
              request={api.request}
              demo={!user}
              onBack={() => goTo("Perfil")}
              onLibrary={backToLibrary}
            />
          ) : view === "Perfil" && !gameId ? (
            <ProfilePage
              state={state}
              execute={safeExecute}
              today={today}
              onGame={openGame}
              onDay={(date) => setModal({ kind: "activity", date })}
              onYear={() => setModal({ kind: "year" })}
              onLibrary={backToLibrary}
              onSettings={() => navigate(settingsPath)}
            />
          ) : view === "Sagas" && !gameId ? (
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
                celebrating={!!celebrating}
                onGame={openGame}
                key={gameId}
                game={ownedGame}
                state={state}
                request={api.request}
                execute={safeExecute}
                onCritic={(critic) => {
                  if (
                    ownedGame.catalogId &&
                    (ownedGame.critic?.score !== critic.score ||
                      ownedGame.critic?.count !== critic.count)
                  )
                    api
                      .execute(
                        {
                          type: "link-catalog",
                          items: [
                            {
                              gameId: ownedGame.id,
                              catalogId: ownedGame.catalogId,
                              critic,
                            },
                          ],
                        },
                        { silent: true },
                      )
                      .catch(() => {});
                }}
                demo={!user}
                today={today}
                onBack={backToLibrary}
                onActivity={() =>
                  setModal({ kind: "activity", id: gameId, date: today })
                }
                onJournal={() => {
                  setJournalGame(gameId);
                  router.push(
                    "/diario?juego=" +
                      encodeURIComponent(gameId) +
                      (user ? "" : "&demo=1"),
                  );
                }}
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
                      : view === "Diario"
                        ? "Cada día que jugaste, con lo que quisiste recordar."
                        : view === "Calendario"
                          ? "Mira de un vistazo qué jugaste cada día del mes."
                          : view === "Favoritos"
                            ? "Los juegos que marcaste con el corazón."
                            : "Un lugar para volver a tus mundos favoritos."}
                  </p>
                </div>
                <Button onClick={() => setModal({ kind: "add" })}>
                  <Plus size={18} /> Añadir juego
                </Button>
              </section>
              {view === "Biblioteca" && showOnboarding(state) && (
                <Onboarding
                  state={state}
                  execute={safeExecute}
                  onAdd={() => setModal({ kind: "add" })}
                  onDay={() => setModal({ kind: "activity", date: today })}
                  onGame={openGame}
                />
              )}
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
                  onJournal={() => goTo("Diario")}
                  onView={goTo}
                  onBulkLink={() => setModal({ kind: "link" })}
                  onImport={(source) => setModal({ kind: "import", source })}
                  demo={!user}
                />
              ) : view === "Diario" ? (
                <section className="panel">
                  <div className="section-header">
                    <h2>Tu diario</h2>
                    <div className="section-actions">
                      <Button
                        variant="ghost"
                        onClick={() => goTo("Calendario")}
                      >
                        <CalendarRange size={16} /> Ver calendario
                      </Button>
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
                  </div>
                  <Recent
                    state={state}
                    onEdit={(a) => setModal({ kind: "activity", activity: a })}
                    full
                    initialGameId={journalGame}
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
                  onJournal={() => goTo("Diario")}
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
              <button
                className="text-link shortcut-link"
                onClick={() => setModal({ kind: "shortcuts" })}
              >
                Atajos: pulsa <kbd>?</kbd>
              </button>
              <ShieldCheck size={13} /> Solo para ti
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {mobileNav.map((n, i) => (
          <Fragment key={n.name}>
            {i === 2 && (
              <Menu.Root modal={false}>
                <Menu.Trigger className="bottom-add" aria-label="Añadir">
                  <Plus size={24} />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Content
                    className="status-menu add-menu"
                    side="top"
                    align="center"
                    sideOffset={10}
                  >
                    <Menu.Item
                      className="status-menu-item"
                      onSelect={() => setModal({ kind: "add" })}
                    >
                      <Plus size={16} /> Añadir juego
                    </Menu.Item>
                    <Menu.Item
                      className="status-menu-item"
                      onSelect={() =>
                        setModal({ kind: "activity", date: today })
                      }
                    >
                      <NotebookPen size={16} /> Registrar hoy
                    </Menu.Item>
                    <Menu.Item
                      className="status-menu-item"
                      onSelect={() => setModal({ kind: "bulk" })}
                    >
                      <CalendarDays size={16} /> Registrar varios días
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Portal>
              </Menu.Root>
            )}
            <button
              className={mobileActive(n.name) ? "active" : ""}
              aria-current={mobileActive(n.name) ? "page" : undefined}
              onClick={() => goTo(n.name)}
            >
              <n.icon size={20} />
              {n.name}
            </button>
          </Fragment>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          {api.canUndo && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label="Deshacer último cambio"
              onClick={async () => {
                try {
                  await api.undo();
                  setModal(null);
                  setNotice("Último cambio deshecho.");
                } catch {}
              }}
            >
              <Undo2 size={15} /> Deshacer
            </Button>
          )}
        </div>
      )}
      {celebrating && (
        <Celebration
          state={state}
          completion={celebrating}
          today={today}
          execute={safeExecute}
          onClose={() => setCelebrating(undefined)}
          onReview={() => {
            const id = celebrating.gameId;
            setCelebrating(undefined);
            // En la propia ficha basta con cambiar de pestaña.
            if (gameId === id) window.location.hash = "resena";
            else router.push(gamePath(id) + suffix + "#resena");
          }}
        />
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
            onOpen={openGame}
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
      {modal?.kind === "shortcuts" && (
        <Modal
          title="Atajos de teclado"
          description="Funcionan cuando no estás escribiendo en un campo."
          onClose={() => setModal(null)}
        >
          <ShortcutList />
        </Modal>
      )}
      {modal?.kind === "import" && (
        <Modal
          title="Importar juegos"
          description="Los juegos que ya tienes no se duplican y entran como pendientes."
          onClose={() => setModal(null)}
        >
          <ImportGames
            state={state}
            execute={safeExecute}
            request={api.request}
            demo={!user}
            initialSource={modal.source}
          />
        </Modal>
      )}
      {modal?.kind === "link" && (
        <Modal
          title="Completar fichas con IGDB"
          description="Vincula los juegos añadidos a mano o importados con su ficha del catálogo."
          onClose={() => setModal(null)}
        >
          <BulkLink
            state={state}
            request={api.request}
            execute={safeExecute}
            onDone={() => setModal(null)}
          />
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
    </div>
  );
}
