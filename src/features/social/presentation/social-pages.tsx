"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Search,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal, type ApiRequest } from "@/features/library/presentation/shared";
import { Markdown } from "@/features/library/presentation/markdown";
import {
  formatDate,
  plural,
  statusLabel,
} from "@/features/library/presentation/format";
import type { PublicGame } from "../domain";
import {
  sendJson,
  useSocial,
  type FeedItem,
  type NetworkData,
  type Person,
  type ProfileData,
  type SocialMe,
  type FeedData,
} from "./social-api";

const profilePath = (handle: string) => "/u/" + encodeURIComponent(handle);

function PersonAvatar({
  person,
  size = "",
}: {
  person: Person;
  size?: string;
}) {
  return (
    <span
      className={
        "avatar avatar-" + (person.avatarColor ?? "violeta") + " " + size
      }
      aria-hidden="true"
    >
      {(person.name || person.handle).slice(0, 1).toLocaleUpperCase("es")}
    </span>
  );
}

// Enlace interno: dentro de la app navega sin recargar; fuera, es un enlace.
function ProfileLink({
  handle,
  onOpen,
  children,
  className = "text-link",
}: {
  handle: string;
  onOpen?: (path: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={className}
      href={profilePath(handle)}
      onClick={(e) => {
        if (!onOpen) return;
        e.preventDefault();
        onOpen(profilePath(handle));
      }}
    >
      {children}
    </Link>
  );
}

const dayKey = (at: string) => {
  const d = new Date(at);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
};
function dayLabel(at: string) {
  const d = new Date(at),
    today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(at) === dayKey(today.toISOString())) return "Hoy";
  if (dayKey(at) === dayKey(yesterday.toISOString())) return "Ayer";
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

const verbs = {
  started: "ha empezado",
  rated: "ha valorado",
  reviewed: "ha escrito la reseña de",
  completed: "ha completado",
} as const;

function Trip({ e }: { e: FeedItem | ProfileData["events"][number] }) {
  const bits = [
    e.days ? plural(e.days, "día", "días") : "",
    e.hours ? e.hours.toLocaleString("es") + " h" : "",
    e.platform ?? "",
  ].filter(Boolean);
  return bits.length ? (
    <small className="feed-trip">Lo jugó en {bits.join(" · ")}</small>
  ) : null;
}

// Actividad agrupada por día: completar un juego es la tarjeta destacada.
export function FeedList({
  events,
  author,
  onOpen,
}: {
  events: (FeedItem | (ProfileData["events"][number] & { author?: Person }))[];
  author?: Person;
  onOpen?: (path: string) => void;
}) {
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: typeof events }[] = [];
    for (const e of events) {
      const key = dayKey(e.at);
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(e);
      else out.push({ key, label: dayLabel(e.at), items: [e] });
    }
    return out;
  }, [events]);
  if (!events.length)
    return <p className="muted">Todavía no hay actividad que mostrar.</p>;
  return (
    <div className="feed">
      {groups.map((g) => (
        <section key={g.key} className="feed-day">
          <h3>{g.label}</h3>
          <ul>
            {g.items.map((e) => {
              const who = ("author" in e && e.author) || author;
              const name = who ? (
                <ProfileLink handle={who.handle} onOpen={onOpen}>
                  {who.name}
                </ProfileLink>
              ) : null;
              const review = who ? (
                <Link
                  className="text-link"
                  href={profilePath(who.handle) + "#juego-" + e.gameId}
                  onClick={(ev) => {
                    if (!onOpen) return;
                    ev.preventDefault();
                    onOpen(profilePath(who.handle) + "#juego-" + e.gameId);
                  }}
                >
                  Leer su reseña
                </Link>
              ) : null;
              return e.type === "completed" ? (
                <li key={e.id} className="feed-card">
                  <span className="feed-cover cover-wrap">
                    {e.cover && <img src={e.cover} alt="" loading="lazy" />}
                  </span>
                  <div>
                    <p className="feed-line">
                      {name} {verbs.completed}
                    </p>
                    <strong className="feed-title">{e.title}</strong>
                    {e.rating !== undefined && (
                      <span className="feed-rating">
                        <Star size={14} fill="currentColor" />{" "}
                        {e.rating.toLocaleString("es")}
                      </span>
                    )}
                    <Trip e={e} />
                    {e.blurb && <q className="feed-blurb">{e.blurb}</q>}
                    {e.hasReview && review}
                  </div>
                </li>
              ) : (
                <li key={e.id} className="feed-small">
                  {who && <PersonAvatar person={who} size="avatar-sm" />}
                  <span>
                    {name} {verbs[e.type]} <strong>{e.title}</strong>
                    {e.type === "rated" && e.rating !== undefined && (
                      <> con un {e.rating.toLocaleString("es")}</>
                    )}
                    {e.type === "reviewed" && <> · {review}</>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function FollowButton({
  request,
  handle,
  following,
  onChange,
}: {
  request: ApiRequest;
  handle: string;
  following: boolean;
  onChange: (following: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <span className="follow-wrap">
      <Button
        variant={following ? "secondary" : "default"}
        size="sm"
        disabled={busy}
        aria-pressed={following}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await sendJson(
              request,
              "/api/social/follow",
              following ? "DELETE" : "POST",
              { handle },
            );
            onChange(r.following);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {following ? (
          <>
            <Check size={14} /> Siguiendo
          </>
        ) : (
          <>
            <UserPlus size={14} /> Seguir
          </>
        )}
      </Button>
      {error && (
        <small className="form-error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}

// Activar el perfil público y elegir el nombre de usuario.
export function SocialSettings({
  request,
  demo,
  compact = false,
}: {
  request: ApiRequest;
  demo: boolean;
  compact?: boolean;
}) {
  const me = useSocial<SocialMe>(request, demo ? null : "/api/social/me");
  const [handle, setHandle] = useState<string>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<{ text: string; error: boolean }>(),
    [confirm, setConfirm] = useState(false),
    [copied, setCopied] = useState(false);
  if (demo)
    return (
      <p className="info-note">
        Inicia sesión para tener un perfil público y seguir a otras personas.
      </p>
    );
  const value = handle ?? me.data?.handle ?? "";
  const link =
    typeof window !== "undefined" && me.data?.handle
      ? window.location.origin + profilePath(me.data.handle)
      : "";
  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    setMessage(undefined);
    try {
      setMessage({ text: await task(), error: false });
      await me.refresh();
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="social-settings">
      {!compact && (
        <p className="muted text-sm">
          Con el perfil público, cualquiera con tu enlace verá tus juegos, tu
          actividad y, al entrar en un juego, tu nota y tus reseñas. Las notas
          con spoilers y lo que anotas como «dónde lo dejé» nunca se comparten,
          y puedes ocultar juegos concretos desde su ficha.
        </p>
      )}
      <form
        className="social-handle"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await sendJson(request, "/api/social/me", "PUT", { handle: value });
            return me.data?.enabled
              ? "Nombre de usuario guardado."
              : "Perfil público activado.";
          });
        }}
      >
        <label htmlFor="social-handle">Nombre de usuario</label>
        <div>
          <span aria-hidden="true">@</span>
          <input
            id="social-handle"
            value={value}
            maxLength={20}
            autoComplete="off"
            placeholder="tu.nombre"
            onChange={(e) => setHandle(e.target.value)}
          />
          <Button disabled={busy || !value.trim()}>
            {me.data?.enabled ? "Guardar" : "Activar perfil público"}
          </Button>
        </div>
      </form>
      {me.data?.enabled && link && (
        <div className="social-link">
          <code>{link}</code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard
                ?.writeText(link)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
            {copied ? "Copiado" : "Copiar enlace"}
          </Button>
        </div>
      )}
      {message && (
        <p
          className={message.error ? "form-error" : "text-sm accent-text"}
          role={message.error ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
      {me.data?.enabled && !compact && (
        <div className="social-off">
          {confirm ? (
            <>
              <p className="muted text-sm">
                Se borrará tu perfil público, tu actividad y la lista de quién
                te sigue. Tu biblioteca no cambia.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await sendJson(request, "/api/social/me", "DELETE");
                    setConfirm(false);
                    setHandle(undefined);
                    return "Perfil público desactivado.";
                  })
                }
              >
                Sí, desactivar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirm(true)}
            >
              Desactivar el perfil público
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Página «Amigos»: buscar, avisos, actividad y a quién sigues.
export function FriendsPage({
  request,
  demo,
  onOpen,
  onUnreadChange,
}: {
  request: ApiRequest;
  demo: boolean;
  onOpen: (path: string) => void;
  onUnreadChange?: () => void;
}) {
  const me = useSocial<SocialMe>(request, demo ? null : "/api/social/me");
  const enabled = !!me.data?.enabled;
  const feed = useSocial<FeedData>(
    request,
    enabled ? "/api/social/feed" : null,
  );
  const net = useSocial<NetworkData>(
    request,
    enabled ? "/api/social/network" : null,
  );
  const [tab, setTab] = useState<"actividad" | "siguiendo" | "seguidores">(
    "actividad",
  );
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<Person[]>(),
    [searchError, setSearchError] = useState("");
  const unread = feed.data?.notifications.some((n) => !n.read);
  // Al ver los avisos se marcan como leídos.
  useEffect(() => {
    if (!unread) return;
    sendJson(request, "/api/social/feed", "POST")
      .then(() => onUnreadChange?.())
      .catch(() => {});
  }, [unread, request, onUnreadChange]);
  const followingSet = new Set(net.data?.following.map((p) => p.handle));
  const refresh = () => {
    net.refresh();
    feed.refresh();
  };
  return (
    <div className="friends-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">LO QUE JUEGA TU GENTE</p>
          <h1>Amigos</h1>
          <p>Sigue a otras personas y mira qué están jugando y terminando.</p>
        </div>
      </section>
      {demo ? (
        <p className="info-note">
          Inicia sesión para seguir a otras personas y ver su actividad.
        </p>
      ) : me.loading ? (
        <p role="status">Cargando…</p>
      ) : !enabled ? (
        <section className="panel">
          <h2>Activa tu perfil público</h2>
          <SocialSettings request={request} demo={demo} />
        </section>
      ) : (
        <>
          <form
            className="friends-search"
            role="search"
            onSubmit={async (e) => {
              e.preventDefault();
              setSearchError("");
              try {
                const r = await sendJson(
                  request,
                  "/api/social/search?q=" + encodeURIComponent(query),
                  "GET",
                );
                setResults(r.people);
              } catch (err) {
                setSearchError((err as Error).message);
              }
            }}
          >
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Buscar personas por nombre de usuario"
              placeholder="Busca a alguien por su nombre de usuario"
              value={query}
              maxLength={21}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button size="sm" disabled={query.trim().length < 2}>
              Buscar
            </Button>
          </form>
          {searchError && (
            <p className="form-error" role="alert">
              {searchError}
            </p>
          )}
          {results && (
            <ul className="people-list" aria-label="Resultados de la búsqueda">
              {results.length ? (
                results.map((p) => (
                  <PersonRow
                    key={p.handle}
                    person={p}
                    request={request}
                    self={p.handle === me.data?.handle}
                    following={followingSet.has(p.handle)}
                    onOpen={onOpen}
                    onChange={refresh}
                  />
                ))
              ) : (
                <li className="muted">Nadie con ese nombre de usuario.</li>
              )}
            </ul>
          )}
          {!!feed.data?.notifications.length && (
            <section className="notices" aria-labelledby="notices-title">
              <h2 id="notices-title">Avisos</h2>
              <ul>
                {feed.data.notifications.slice(0, 6).map((n) => (
                  <li key={n.id} className={n.read ? "" : "unread"}>
                    <PersonAvatar person={n.from} size="avatar-sm" />
                    <span>
                      <ProfileLink handle={n.from.handle} onOpen={onOpen}>
                        {n.from.name}
                      </ProfileLink>{" "}
                      ha empezado a seguirte
                      <small> · {formatDate(n.at.slice(0, 10))}</small>
                    </span>
                    {!followingSet.has(n.from.handle) && (
                      <FollowButton
                        request={request}
                        handle={n.from.handle}
                        following={false}
                        onChange={refresh}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div
            className="segmented friends-tabs"
            role="group"
            aria-label="Qué ver"
          >
            {(
              [
                ["actividad", "Actividad"],
                [
                  "siguiendo",
                  "Siguiendo (" + (net.data?.following.length ?? 0) + ")",
                ],
                [
                  "seguidores",
                  "Te siguen (" + (net.data?.followers.length ?? 0) + ")",
                ],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                className={tab === id ? "selected" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "actividad" &&
            (feed.loading ? (
              <p role="status">Cargando la actividad…</p>
            ) : feed.error ? (
              <p className="form-error" role="alert">
                {feed.error}
              </p>
            ) : !feed.data?.following ? (
              <p className="info-note">
                Aún no sigues a nadie. Busca a alguien por su nombre de usuario
                o pídele el enlace de su perfil.
              </p>
            ) : (
              <FeedList events={feed.data.events} onOpen={onOpen} />
            ))}
          {tab !== "actividad" && (
            <ul className="people-list">
              {(tab === "siguiendo"
                ? net.data?.following
                : net.data?.followers
              )?.map((p) => (
                <PersonRow
                  key={p.handle}
                  person={p}
                  request={request}
                  following={followingSet.has(p.handle)}
                  onOpen={onOpen}
                  onChange={refresh}
                />
              ))}
              {!(
                tab === "siguiendo" ? net.data?.following : net.data?.followers
              )?.length && (
                <li className="muted">
                  {tab === "siguiendo"
                    ? "Aún no sigues a nadie."
                    : "Todavía no te sigue nadie. Comparte tu enlace desde ajustes."}
                </li>
              )}
            </ul>
          )}
          <p className="muted text-xs">
            Tu perfil:{" "}
            <ProfileLink handle={me.data!.handle!} onOpen={onOpen}>
              @{me.data!.handle}
            </ProfileLink>
          </p>
        </>
      )}
    </div>
  );
}

function PersonRow({
  person,
  request,
  following,
  self = false,
  onOpen,
  onChange,
}: {
  person: Person;
  request: ApiRequest;
  following: boolean;
  self?: boolean;
  onOpen: (path: string) => void;
  onChange: () => void;
}) {
  return (
    <li className="person-row">
      <PersonAvatar person={person} />
      <span>
        <ProfileLink
          handle={person.handle}
          onOpen={onOpen}
          className="person-name"
        >
          {person.name}
        </ProfileLink>
        <small>@{person.handle}</small>
      </span>
      {!self && (
        <FollowButton
          request={request}
          handle={person.handle}
          following={following}
          onChange={onChange}
        />
      )}
    </li>
  );
}

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

const shelves = [
  ["todos", "Todos"],
  ["jugando", "Jugando"],
  ["completado", "Completados"],
  ["pendiente", "Pendientes"],
  ["deseos", "Deseados"],
] as const;

// Perfil público de otra persona (o el tuyo, tal y como lo ven los demás).
export function PublicProfileView({
  handle,
  request,
  signedIn,
  onOpen,
  onBack,
}: {
  handle: string;
  request: ApiRequest;
  signedIn: boolean;
  onOpen?: (path: string) => void;
  onBack?: () => void;
}) {
  const data = useSocial<ProfileData>(
    request,
    "/api/social/u/" + encodeURIComponent(handle),
  );
  const [following, setFollowing] = useState<boolean>();
  const [shelf, setShelf] = useState<(typeof shelves)[number][0]>("todos");
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  const openGame = hash.startsWith("juego-") ? hash.slice(6) : undefined;
  if (data.loading) return <p role="status">Cargando perfil…</p>;
  if (data.error || !data.data)
    return (
      <section className="empty-state">
        <h1>Perfil no encontrado</h1>
        <p>{data.error || "No hay nadie con ese nombre de usuario."}</p>
      </section>
    );
  const { profile, events, self } = data.data;
  const person: Person = {
    handle: profile.handle,
    name: profile.name || profile.handle,
    avatarColor: profile.avatarColor,
  };
  const games = profile.library.filter((g) =>
    shelf === "todos"
      ? !g.wishlist
      : shelf === "deseos"
        ? g.wishlist
        : !g.wishlist && g.status === shelf,
  );
  const isFollowing = following ?? data.data.following;
  return (
    <div className="public-profile">
      {onBack && (
        <button className="game-back" onClick={onBack}>
          <ArrowLeft size={16} /> Volver a Amigos
        </button>
      )}
      <header className="profile-hero">
        <PersonAvatar person={person} size="avatar-xl" />
        <div>
          <p className="eyebrow">@{profile.handle}</p>
          <h1>{person.name}</h1>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </div>
        <div className="profile-hero-actions">
          {self ? (
            <span className="muted text-sm">Así ven tu perfil los demás</span>
          ) : signedIn ? (
            <FollowButton
              request={request}
              handle={profile.handle}
              following={isFollowing}
              onChange={setFollowing}
            />
          ) : (
            <Link className="ui-button btn-default public-cta" href="/">
              <Users size={15} /> Únete a Archivario para seguirle
            </Link>
          )}
        </div>
      </header>
      <section className="profile-stats" aria-label="Resumen">
        {(
          [
            [profile.stats.games, "juegos"],
            [profile.stats.completed, "completados"],
            [profile.stats.playing, "jugando ahora"],
          ] as const
        ).map(([n, label]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      {profile.playing.length > 0 && (
        <section className="panel">
          <h2>Jugando ahora</h2>
          <CoverRow items={profile.playing} />
        </section>
      )}
      <div className="profile-columns">
        <section className="panel">
          <h2>Actividad reciente</h2>
          <FeedList events={events} author={person} onOpen={onOpen} />
        </section>
        {profile.favorites.length > 0 && (
          <section className="panel">
            <h2>Favoritos</h2>
            <CoverRow items={profile.favorites} />
          </section>
        )}
      </div>
      <section className="panel">
        <div className="section-header">
          <h2>Sus juegos</h2>
          <div
            className="segmented shelf-tabs"
            role="group"
            aria-label="Estantería"
          >
            {shelves.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={shelf === id}
                className={shelf === id ? "selected" : ""}
                onClick={() => setShelf(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {games.length ? (
          <ul className="public-games">
            {games.map((g) => (
              <li key={g.gameId}>
                <a
                  href={"#juego-" + g.gameId}
                  className="public-game"
                  aria-label={"Ver " + g.title}
                >
                  <span className="cover-wrap">
                    {g.cover && <img src={g.cover} alt="" loading="lazy" />}
                    <span
                      className={
                        "public-status status-badge status-" +
                        g.status.replace(" ", "-")
                      }
                    >
                      <i />
                      {statusLabel(g.status)}
                    </span>
                  </span>
                  <span className="public-game-title">{g.title}</span>
                  {g.rating !== undefined && (
                    <small>★ {g.rating.toLocaleString("es")}</small>
                  )}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nada en esta estantería.</p>
        )}
      </section>
      {openGame && (
        <GameDetailModal
          request={request}
          handle={profile.handle}
          gameId={openGame}
          onClose={() => {
            history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }}
        />
      )}
    </div>
  );
}

function CoverRow({
  items,
}: {
  items: { gameId: string; title: string; cover?: string }[];
}) {
  return (
    <ul className="showcase-row">
      {items.map((g) => (
        <li key={g.gameId}>
          <a
            href={"#juego-" + g.gameId}
            className="showcase-game"
            aria-label={"Ver " + g.title}
          >
            <span className="cover-wrap">
              {g.cover && <img src={g.cover} alt="" loading="lazy" />}
            </span>
            <span>{g.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function GameDetailModal({
  request,
  handle,
  gameId,
  onClose,
}: {
  request: ApiRequest;
  handle: string;
  gameId: string;
  onClose: () => void;
}) {
  const game = useSocial<PublicGame>(
    request,
    "/api/social/u/" +
      encodeURIComponent(handle) +
      "/games/" +
      encodeURIComponent(gameId),
  );
  const g = game.data;
  return (
    <Modal
      title={g?.title ?? "Juego"}
      description={"En la biblioteca de @" + handle}
      onClose={onClose}
    >
      {game.loading ? (
        <p role="status">Cargando…</p>
      ) : !g ? (
        <p className="form-error" role="alert">
          {game.error || "Ese juego no está compartido."}
        </p>
      ) : (
        <div className="public-detail">
          <div className="public-detail-head">
            <span className="cover-wrap">
              {g.cover && <img src={g.cover} alt="" />}
            </span>
            <dl>
              <div>
                <dt>Estado</dt>
                <dd>
                  {g.wishlist ? "En su lista de deseos" : statusLabel(g.status)}
                </dd>
              </div>
              {g.rating !== undefined && (
                <div>
                  <dt>Su nota</dt>
                  <dd>★ {g.rating.toLocaleString("es")} / 10</dd>
                </div>
              )}
              <div>
                <dt>Plataforma</dt>
                <dd>{g.platform}</dd>
              </div>
              {g.completedOn && (
                <div>
                  <dt>Lo terminó</dt>
                  <dd>{formatDate(g.completedOn)}</dd>
                </div>
              )}
            </dl>
          </div>
          {g.review ? (
            <>
              <h3>Su reseña</h3>
              <Markdown className="game-prose" text={g.review} />
            </>
          ) : (
            <p className="muted">No ha escrito reseña de este juego.</p>
          )}
          {g.runReviews.map((r) => (
            <div key={r.label} className="public-run">
              <h3>
                {r.label}
                {r.rating !== undefined && (
                  <small> · ★ {r.rating.toLocaleString("es")}</small>
                )}
              </h3>
              <Markdown className="game-prose" text={r.review} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
