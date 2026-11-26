"use client";
import { Fragment, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  BookOpen,
  CalendarDays,
  Check,
  Gamepad2,
  Heart,
  Layers3,
  ListChecks,
  LogOut,
  NotebookPen,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Undo2,
  Users,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { configured, clientAuth } from "@/features/account/firebase-client";
import { useLibrary } from "./use-library";
import { dateInZone } from "../domain/model";
import { GlobalSearch } from "./library-improvements";
import { Login } from "./login";
import { VerifyEmailBanner } from "./verify-email";
import { useShortcuts } from "./shortcuts";
import { AppModals, load, shortcutModal, type ModalState } from "./modals";
import { DayNotices } from "./notices";
import { clearOfflineData } from "./offline-store";
import { CalendarView, Recent } from "./journal";
import { LibraryView } from "./library-view";
import { useLibraryFilters, viewDefaults } from "./library-filters";
import { Avatar, type Execute } from "./shared";
import { plural } from "./format";
import {
  publicRequest,
  useSocial,
  type SocialMe,
} from "@/features/social/presentation/social-api";
import { Onboarding, showOnboarding } from "./onboarding";
import { SidebarPlaying } from "./sidebar-playing";
import { Celebration, completedBy, type Completion } from "./celebration";
import { SessionBar } from "./session-timer";
import {
  gamePath,
  parsePath,
  sagaPath,
  settingsPath,
  viewPaths,
} from "./routes";

// Cada vista se descarga al abrirla, para que la primera carga sea ligera.
const CatalogGamePage = load(() =>
  import("./catalog-game-page").then((m) => m.CatalogGamePage),
);
const Sagas = load(() => import("./sagas").then((m) => m.Sagas));
const GamePage = load(() => import("./game-page").then((m) => m.GamePage));
const Planning = load(() => import("./planning").then((m) => m.Planning));
const YearReview = load(() =>
  import("./year-review").then((m) => m.YearReview),
);
const ProfilePage = load(() =>
  import("./profile-page").then((m) => m.ProfilePage),
);
const SettingsPage = load(() =>
  import("./settings-page").then((m) => m.SettingsPage),
);
const FriendsPage = load(() =>
  import("@/features/social/presentation/social-pages").then(
    (m) => m.FriendsPage,
  ),
);
const PublicProfileView = load(() =>
  import("@/features/social/presentation/social-pages").then(
    (m) => m.PublicProfileView,
  ),
);

export function ArchivarioApp() {
  const pathname = usePathname(),
    router = useRouter();
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
  // Un perfil público se puede ver sin iniciar sesión.
  if (!user && !demo && pathname.startsWith("/u/"))
    return (
      <PublicShell
        handle={decodeURIComponent(pathname.split("/")[2] ?? "")}
        onLogin={() => router.push("/")}
      />
    );
  if (!user && !demo) return <Login onDemo={() => setDemo(true)} />;
  return (
    <Dashboard
      key={user?.uid ?? "demo"}
      user={user}
      onLogin={() => setDemo(false)}
    />
  );
}

const nav = [
  { name: "Biblioteca", icon: BookOpen },
  { name: "Sagas", icon: Layers3 },
  { name: "Diario", icon: NotebookPen },
  { name: "Listas", icon: ListChecks },
  { name: "Favoritos", icon: Heart },
  { name: "Próximos", icon: Sparkles },
  { name: "Amigos", icon: Users },
];
// En móvil, Favoritos y Próximos son vistas dentro de la biblioteca, las
// listas se abren desde ella y el perfil, desde el avatar de arriba. El
// calendario es una vista del diario. En medio va el botón de añadir.
const mobileNav = nav.filter((n) =>
  ["Biblioteca", "Sagas", "Diario", "Amigos"].includes(n.name),
);
// Título de cada vista. En móvil solo se muestra el título, en pequeño.
const headings: Record<
  string,
  { eyebrow: string; title: string; text: string }
> = {
  Biblioteca: {
    eyebrow: "CADA JUEGO, UNA HISTORIA",
    title: "Tu próxima aventura empieza aquí.",
    text: "Un lugar para volver a tus mundos favoritos.",
  },
  Favoritos: {
    eyebrow: "TUS JUEGOS, A TU RITMO",
    title: "Los que se quedan contigo.",
    text: "Los juegos que marcaste con el corazón.",
  },
  Próximos: {
    eyebrow: "TUS JUEGOS, A TU RITMO",
    title: "Un pequeño horizonte.",
    text: "Todos tus juegos pendientes y tus próximos favoritos. Sin fechas límite.",
  },
  Diario: {
    eyebrow: "TUS JUEGOS, A TU RITMO",
    title: "Lo que has estado jugando.",
    text: "Cada día que jugaste, con lo que quisiste recordar.",
  },
  Calendario: {
    eyebrow: "UN DÍA, UN NUEVO RECUERDO",
    title: "Tu calendario de aventuras.",
    text: "Mira de un vistazo qué jugaste cada día del mes.",
  },
  Listas: {
    eyebrow: "A TU MANERA",
    title: "Tus listas y próximos planes.",
    text: "Agrupa tus juegos, ordénalos y compara cuál empezar.",
  },
  Resumen: {
    eyebrow: "UN VISTAZO ATRÁS",
    title: "Tu año en juegos.",
    text: "Los mundos que has visitado, mes a mes.",
  },
};

function Dashboard({
  user,
  onLogin,
}: {
  user: User | null;
  onLogin: () => void;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const { view, gameId, sagaId, settings, handle } = parsePath(pathname);
  const [modal, setModal] = useState<ModalState>(shortcutModal),
    [notice, setNotice] = useState(""),
    // Juego con el que se abre el diario desde una ficha.
    [journalGame, setJournalGame] = useState<string>();
  // Vista desde la que se abrió una ficha del catálogo, para volver a ella.
  const [origin, setOrigin] = useState<{ view: string; sagaId?: string }>({
    view: sagaId !== undefined ? "Sagas" : "Biblioteca",
    sagaId,
  });
  const filterState = useLibraryFilters(viewDefaults(view));
  const api = useLibrary(user),
    { state, execute, ready, busy, error, setError } = api;
  const social = useSocial<SocialMe>(
    api.request,
    user ? "/api/social/me" : null,
  );
  // Navega a una ruta interna que puede llevar #fragmento (p. ej. un juego).
  const openPath = (path: string) => {
    const [base, hash] = path.split("#");
    setModal(null);
    router.push(base + suffix + (hash ? "#" + hash : ""));
  };
  const today = dateInZone(new Date(), state.profile.timezone),
    [month, setMonth] = useState(today.slice(0, 7));
  const suffix = user ? "" : "?demo=1";
  const mobileActive = (name: string) =>
    view === name ||
    (name === "Biblioteca" &&
      ["Favoritos", "Próximos", "Listas", "Resumen"].includes(view)) ||
    (name === "Diario" && view === "Calendario");

  const sideActive = (name: string) =>
    view === name || (name === "Diario" && view === "Calendario");

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
    // El orden de prioridad solo tiene sentido en Próximos.
    else if (filterState.filters.sort === "priority")
      filterState.set("sort", "recent");
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
  // El acceso directo ya ha abierto su ventana: se limpia la dirección.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("accion"))
      router.replace(pathname + (user ? "" : "?demo=1"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
        : c.type === "timer"
          ? c.timer
            ? "Sesión en marcha. Párala cuando termines de jugar."
            : "Sesión descartada."
          : c.type === "log-session"
            ? "Sesión apuntada en el diario."
            : c.type === "save-priority"
              ? "Orden de prioridad guardado."
              : "Guardado en " +
                (user ? "tu biblioteca" : "la demostración local"),
    );
  };
  useShortcuts(ready && !modal, {
    n: () => setModal({ kind: "add" }),
    d: () => setModal({ kind: "activity", date: today }),
    t: () => setModal({ kind: "tonight" }),
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
  const journalView = view === "Diario" || view === "Calendario";
  const headingKind = journalView
    ? "diario"
    : view === "Listas" || view === "Resumen"
      ? "pagina"
      : "biblioteca";
  const heading = headings[view] ?? headings.Biblioteca;
  const stopSession = () => setModal({ kind: "stop", at: Date.now() });
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
              className={sideActive(n.name) ? "active" : ""}
              aria-current={sideActive(n.name) ? "page" : undefined}
              onClick={() => goTo(n.name)}
            >
              <n.icon size={19} />
              {n.name}
              {n.name === "Biblioteca" && (
                <span className="nav-count">{state.games.length}</span>
              )}
              {n.name === "Amigos" && !!social.data?.unread && (
                <span
                  className="nav-count nav-unread"
                  aria-label={plural(
                    social.data.unread,
                    "aviso nuevo",
                    "avisos nuevos",
                  )}
                >
                  {social.data.unread}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <SidebarPlaying
            state={state}
            today={today}
            execute={safeExecute}
            onGame={openGame}
          />
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
          {/* En móvil, este hueco muestra la marca. */}
          <span className="breadcrumbs" aria-hidden="true" />
          <div className="top-actions">
            <GlobalSearch
              state={state}
              request={api.request}
              demo={!user}
              onGame={openGame}
              onSaga={openSaga}
            />
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
          <DayNotices
            state={state}
            today={today}
            onGame={openGame}
            onStop={stopSession}
          />
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
          {view === "Amigos" && handle ? (
            <PublicProfileView
              key={handle}
              handle={handle}
              request={user ? api.request : publicRequest}
              signedIn={!!user}
              onOpen={openPath}
              onBack={() => goTo("Amigos")}
            />
          ) : view === "Amigos" ? (
            <FriendsPage
              request={api.request}
              demo={!user}
              onOpen={openPath}
              onUnreadChange={social.refresh}
            />
          ) : view === "Perfil" && settings ? (
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
              onYear={() => goTo("Resumen")}
              onLibrary={backToLibrary}
              onSettings={() => navigate(settingsPath)}
              onFriends={() => goTo("Amigos")}
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
                onStopSession={stopSession}
                onTag={(tag) => {
                  filterState.reset({ tag });
                  navigate("/");
                }}
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
              <section className={"page-heading heading-" + headingKind}>
                <div>
                  <p className="eyebrow">{heading.eyebrow}</p>
                  <h1>{heading.title}</h1>
                  <p>{heading.text}</p>
                </div>
                {journalView ? (
                  <Button
                    onClick={() => setModal({ kind: "activity", date: today })}
                  >
                    <Plus size={18} /> Registrar un día
                  </Button>
                ) : headingKind === "biblioteca" ? (
                  <Button onClick={() => setModal({ kind: "add" })}>
                    <Plus size={18} /> Añadir juego
                  </Button>
                ) : null}
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
                  onPlanning={() => goTo("Listas")}
                  onTonight={() => setModal({ kind: "tonight" })}
                  onPriority={() => setModal({ kind: "priority" })}
                  onStopSession={stopSession}
                  request={api.request}
                  onReleaseDates={(items) =>
                    api
                      .execute(
                        { type: "link-catalog", items },
                        { silent: true },
                      )
                      .catch(() => {})
                  }
                  onYear={() => goTo("Resumen")}
                  onEditActivity={(a) =>
                    setModal({ kind: "activity", activity: a })
                  }
                  onJournal={() => goTo("Diario")}
                  onView={goTo}
                  onBulkLink={() => setModal({ kind: "link" })}
                  onImport={(source) => setModal({ kind: "import", source })}
                  demo={!user}
                />
              ) : view === "Listas" ? (
                <section className="panel page-panel">
                  <Planning
                    state={state}
                    execute={safeExecute}
                    onGame={openGame}
                    handle={
                      social.data?.enabled ? social.data.handle : undefined
                    }
                  />
                </section>
              ) : view === "Resumen" ? (
                <section className="panel page-panel">
                  <YearReview state={state} today={today} onGame={openGame} />
                </section>
              ) : (
                <>
                  <div className="journal-bar">
                    <div
                      className="library-views journal-views"
                      role="group"
                      aria-label="Cómo ver el diario"
                    >
                      {(
                        [
                          ["Diario", "Lista", NotebookPen],
                          ["Calendario", "Calendario", CalendarDays],
                        ] as const
                      ).map(([name, label, Icon]) => (
                        <button
                          key={name}
                          aria-pressed={view === name}
                          className={view === name ? "selected" : ""}
                          onClick={() => goTo(name)}
                        >
                          <Icon size={15} aria-hidden="true" /> {label}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setModal({ kind: "bulk" })}
                    >
                      Registrar varios días
                    </Button>
                  </div>
                  {view === "Diario" ? (
                    <section className="panel">
                      <h2 className="sr-only">Tu diario</h2>
                      <Recent
                        state={state}
                        today={today}
                        onEdit={(a) =>
                          setModal({ kind: "activity", activity: a })
                        }
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
                    />
                  )}
                </>
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
              {n.name === "Amigos" && !!social.data?.unread && (
                <span className="bottom-unread" aria-hidden="true" />
              )}
            </button>
          </Fragment>
        ))}
      </nav>
      {modal?.kind !== "stop" && (
        <SessionBar state={state} onStop={stopSession} onGame={openGame} />
      )}
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
          social={!!social.data?.enabled}
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
      {modal && (
        <AppModals
          modal={modal}
          state={state}
          today={today}
          demo={!user}
          execute={safeExecute}
          request={api.request}
          onClose={() => setModal(null)}
          onGame={openGame}
        />
      )}
    </div>
  );
}

// Perfil público para quien no ha iniciado sesión.
function PublicShell({
  handle,
  onLogin,
}: {
  handle: string;
  onLogin: () => void;
}) {
  return (
    <div className="public-shell">
      <header className="public-shell-bar">
        <span className="brand">
          <Gamepad2 size={26} /> Archivario
          <span className="brand-dot" />
        </span>
        <Button size="sm" variant="secondary" onClick={onLogin}>
          Iniciar sesión
        </Button>
      </header>
      <main id="main-content">
        <PublicProfileView
          handle={handle}
          request={publicRequest}
          signedIn={false}
        />
      </main>
    </div>
  );
}
