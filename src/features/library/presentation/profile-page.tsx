"use client";
import { useMemo, useState } from "react";
import { BarChart3, Pencil, Settings, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Library } from "../domain/model";
import {
  latestReviews,
  profileStats,
  SHOWCASE_MAX,
  showcaseGames,
} from "../domain/profile";
import { Avatar, Cover, type ApiRequest, type Execute } from "./shared";
import { SettingsPanel } from "./forms";
import { Heatmap } from "./heatmap";
import { Markdown } from "./markdown";
import { formatDate, plural } from "./format";

const decimal = (n: number) =>
  n.toLocaleString("es", { maximumFractionDigits: 1 });

export function ProfilePage({
  state,
  execute,
  request,
  demo,
  today,
  onGame,
  onDay,
  onYear,
  onLibrary,
}: {
  state: Library;
  execute: Execute;
  request: ApiRequest;
  demo: boolean;
  today: string;
  onGame: (id: string) => void;
  onDay: (date: string) => void;
  onYear: () => void;
  onLibrary: () => void;
}) {
  const stats = useMemo(() => profileStats(state), [state]);
  const showcase = showcaseGames(state);
  const reviews = latestReviews(state);
  const [year, setYear] = useState(today.slice(0, 4));
  const years = useMemo(
    () =>
      [
        ...new Set([
          today.slice(0, 4),
          ...state.activities.map((a) => a.date.slice(0, 4)),
        ]),
      ]
        .sort()
        .reverse(),
    [state.activities, today],
  );
  const [picking, setPicking] = useState(false);
  const toSettings = () =>
    document
      .getElementById("profile-settings")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="profile-page">
      <header className="profile-hero">
        <Avatar profile={state.profile} className="avatar-xl" />
        <div>
          <p className="eyebrow">TU PERFIL</p>
          <h1 tabIndex={-1}>{state.profile.name || "Tu perfil"}</h1>
          <p className="profile-bio">
            {state.profile.bio || "Añade una frase sobre ti en los ajustes."}
          </p>
          {stats.since && (
            <p className="muted text-xs">
              Primer registro: {formatDate(stats.since)}
            </p>
          )}
        </div>
        <div className="profile-hero-actions">
          <Button variant="secondary" onClick={onYear}>
            <BarChart3 size={16} /> Tu año en juegos
          </Button>
          <Button variant="ghost" onClick={toSettings}>
            <Settings size={16} /> Ajustes
          </Button>
        </div>
      </header>

      <section className="profile-stats" aria-label="Tu resumen">
        {(
          [
            [stats.games, "en la biblioteca"],
            [stats.completed, "completados"],
            [stats.playing, "jugando ahora"],
            [stats.days, "días jugados"],
            [stats.hours, "horas en partidas completadas"],
            [stats.reviews, "reseñas escritas"],
          ] as const
        ).map(([n, label]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <div className="profile-columns">
        <section className="panel profile-showcase">
          <div className="section-header">
            <h2>Tu escaparate</h2>
            <button
              className="text-link"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
            >
              <Pencil size={14} /> {picking ? "Cerrar" : "Elegir destacados"}
            </button>
          </div>
          {picking ? (
            <ShowcasePicker
              state={state}
              execute={execute}
              onDone={() => setPicking(false)}
            />
          ) : showcase.games.length ? (
            <>
              <div className="showcase-row">
                {showcase.games.map((g) => (
                  <button
                    key={g.id}
                    className="showcase-game"
                    onClick={() => onGame(g.id)}
                    aria-label={"Abrir " + g.title}
                  >
                    <span className="cover-wrap">
                      <Cover game={g} />
                    </span>
                    <span>{g.title}</span>
                  </button>
                ))}
              </div>
              {!showcase.chosen && (
                <p className="muted text-xs mt-3">
                  Mostramos tus favoritos mejor valorados. Pulsa «Elegir
                  destacados» para escoger tú hasta {SHOWCASE_MAX}.
                </p>
              )}
            </>
          ) : (
            <p className="muted">
              Marca juegos con el corazón o elige tus destacados para mostrarlos
              aquí.
            </p>
          )}
        </section>

        <section className="panel profile-taste">
          <h2>Tus gustos</h2>
          {stats.compared > 0 && (
            <div className="taste-compare">
              <div>
                <span>Tu nota media</span>
                <strong>{decimal(stats.myAverage!)}/10</strong>
              </div>
              <div>
                <span>La crítica (IGDB)</span>
                <strong>{decimal(stats.criticAverage!)}/10</strong>
              </div>
              <p className="muted text-xs">
                En los{" "}
                {plural(stats.compared, "juego que tiene", "juegos que tienen")}{" "}
                las dos notas.{" "}
                {stats.myAverage! - stats.criticAverage! >= 0.5
                  ? "Tus notas son más generosas que las de la crítica."
                  : stats.criticAverage! - stats.myAverage! >= 0.5
                    ? "Tus notas son más exigentes que las de la crítica."
                    : "Tus notas se parecen bastante a las de la crítica."}
              </p>
            </div>
          )}
          {(
            [
              ["Géneros", stats.genres],
              ["Plataformas", stats.platforms],
            ] as const
          ).map(([title, rows]) => (
            <div key={title} className="taste-list">
              <h3>{title}</h3>
              {rows.length ? (
                <ul>
                  {rows.map((r) => (
                    <li key={r.name}>
                      <span>{r.name}</span>
                      <small>{plural(r.count, "juego", "juegos")}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted text-sm">Aún sin datos.</p>
              )}
            </div>
          ))}
        </section>
      </div>

      <section className="panel">
        <div className="section-header">
          <h2>Tu año jugando</h2>
        </div>
        <Heatmap
          state={state}
          year={year}
          years={years}
          onYear={setYear}
          onDay={onDay}
        />
      </section>

      <div className="profile-columns">
        <section className="panel">
          <h2>Último completado</h2>
          {stats.lastCompleted ? (
            <button
              className="last-completed"
              onClick={() => onGame(stats.lastCompleted!.game.id)}
            >
              <span className="cover-wrap">
                <Cover game={stats.lastCompleted.game} />
              </span>
              <span>
                <strong>{stats.lastCompleted.game.title}</strong>
                <small>{formatDate(stats.lastCompleted.date)}</small>
                {stats.lastCompleted.game.rating && (
                  <small>
                    <Star size={12} />{" "}
                    {stats.lastCompleted.game.rating.toLocaleString("es")}/10
                  </small>
                )}
              </span>
            </button>
          ) : (
            <p className="muted">
              Cuando completes una partida aparecerá aquí.{" "}
              <button className="text-link" onClick={onLibrary}>
                Ir a la biblioteca
              </button>
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Tus últimas reseñas</h2>
          {reviews.length ? (
            <ul className="profile-reviews">
              {reviews.map((g) => (
                <li key={g.id}>
                  <button className="text-link" onClick={() => onGame(g.id)}>
                    {g.title}
                  </button>
                  <Markdown className="game-prose clamp" text={g.review} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              <Sparkles size={14} /> Escribe la reseña de un juego desde su
              ficha y la verás aquí.
            </p>
          )}
        </section>
      </div>

      <section className="panel" id="profile-settings">
        <h2>Ajustes</h2>
        <p className="muted text-sm mb-4">
          Tu perfil y tus notas son privados.
        </p>
        <SettingsPanel
          state={state}
          execute={execute}
          request={request}
          demo={demo}
          onClose={onLibrary}
        />
      </section>
    </div>
  );
}

function ShowcasePicker({
  state,
  execute,
  onDone,
}: {
  state: Library;
  execute: Execute;
  onDone: () => void;
}) {
  const [ids, setIds] = useState<string[]>(() =>
    showcaseGames(state).games.map((g) => g.id),
  );
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const games = [...state.games].sort((a, b) =>
    a.title.localeCompare(b.title, "es"),
  );
  const save = async (showcase: string[] | undefined) => {
    setPending(true);
    setError("");
    try {
      await execute({
        type: "profile",
        profile: { ...state.profile, showcase },
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="showcase-picker">
      <p className="muted text-sm" role="status">
        {ids.length} de {SHOWCASE_MAX} elegidos. Se muestran en el orden en que
        los marques.
      </p>
      <div className="showcase-options">
        {games.map((g) => {
          const checked = ids.includes(g.id);
          return (
            <label key={g.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && ids.length >= SHOWCASE_MAX}
                onChange={(e) =>
                  setIds((cur) =>
                    e.target.checked
                      ? [...cur, g.id]
                      : cur.filter((id) => id !== g.id),
                  )
                }
              />{" "}
              {g.title}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={pending} onClick={() => save(ids)}>
          Guardar escaparate
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => save(undefined)}
        >
          Usar mis favoritos
        </Button>
      </div>
    </div>
  );
}
