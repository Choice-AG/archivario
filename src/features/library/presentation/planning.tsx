"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameList, Library } from "../domain/model";
import {
  estimatedHours,
  formatHours,
  listProgress,
  timeLabels,
  type TimeMode,
} from "../domain/daily";
import { moveGame, playableGames } from "../domain/planning";
import type { Execute } from "./app";
export function Planning({
  state,
  execute,
  onGame,
}: {
  state: Library;
  execute: Execute;
  onGame: (id: string) => void;
}) {
  const [tab, setTab] = useState("Mis listas");
  return (
    <div>
      <div className="segmented planning-tabs">
        {["Mis listas", "¿A qué juego hoy?", "Comparar"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Mis listas" ? (
        <Lists state={state} execute={execute} onGame={onGame} />
      ) : tab === "Comparar" ? (
        <Compare state={state} onGame={onGame} />
      ) : (
        <Picker state={state} onGame={onGame} />
      )}
    </div>
  );
}
function Lists({
  state,
  execute,
  onGame,
}: {
  state: Library;
  execute: Execute;
  onGame: (id: string) => void;
}) {
  const [draft, setDraft] = useState<GameList>(),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [confirm, setConfirm] = useState(""),
    [search, setSearch] = useState("");
  async function remove(id: string) {
    setPending(true);
    setError("");
    try {
      await execute({ type: "delete-list", id });
      setConfirm("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <section>
      <p className="info-note">
        Agrupa juegos de tu biblioteca y ordénalos a tu gusto. Quitar una lista
        no borra sus juegos.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {draft ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError("");
            try {
              await execute({ type: "save-list", list: draft });
              setDraft(undefined);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset disabled={pending}>
            <label>
              Nombre de la lista
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Descripción de la lista
              <textarea
                maxLength={1000}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </label>
            <h3>Orden de los juegos</h3>
            <ol className="ordered-games">
              {draft.gameIds.map((id, i) => {
                const g = state.games.find((g) => g.id === id);
                return (
                  <li key={id}>
                    <span>
                      {i + 1}. {g?.title}
                    </span>
                    <button
                      type="button"
                      aria-label={"Subir " + g?.title}
                      disabled={i === 0}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          gameIds: moveGame(draft.gameIds, i, -1),
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={"Bajar " + g?.title}
                      disabled={i === draft.gameIds.length - 1}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          gameIds: moveGame(draft.gameIds, i, 1),
                        })
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={"Quitar de la lista " + g?.title}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          gameIds: draft.gameIds.filter((x) => x !== id),
                        })
                      }
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
            <label>
              Buscar juegos para la lista
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="planning-options">
              {state.games
                .filter(
                  (g) =>
                    !draft.gameIds.includes(g.id) &&
                    g.title
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                )
                .map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() =>
                      setDraft({ ...draft, gameIds: [...draft.gameIds, g.id] })
                    }
                  >
                    + {g.title}
                  </button>
                ))}
            </div>
            <div className="form-actions">
              <Button>Guardar lista</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(undefined);
                  setError("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <Button
            onClick={() => {
              setDraft({
                id: crypto.randomUUID(),
                name: "",
                description: "",
                gameIds: [],
              });
              setSearch("");
              setError("");
            }}
          >
            Nueva lista
          </Button>
          {!(state.lists ?? []).length && (
            <p className="info-note">
              Crea tu primera lista: para jugar en pareja, tus favoritos o una
              saga pendiente.
            </p>
          )}
          {(state.lists ?? []).map((l) => (
            <section className="personal-list" key={l.id}>
              <h3>{l.name}</h3>
              <p>{l.description}</p>
              <small>
                {listProgress(state, l.gameIds).completed} / {l.gameIds.length}{" "}
                juegos completados · {listProgress(state, l.gameIds).percent}%
              </small>
              <progress
                className="list-progress"
                aria-label={"Progreso de " + l.name}
                value={listProgress(state, l.gameIds).completed}
                max={l.gameIds.length || 1}
              />
              <p className="muted text-xs">
                Cuenta juegos con al menos una partida completada.
              </p>
              <ol>
                {l.gameIds.map((id) => (
                  <li key={id}>
                    <button className="text-link" onClick={() => onGame(id)}>
                      {state.games.find((g) => g.id === id)?.title}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="form-actions">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    setDraft({ ...l, gameIds: [...l.gameIds] });
                    setSearch("");
                    setError("");
                  }}
                >
                  Editar {l.name}
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setConfirm(l.id)}
                >
                  Eliminar lista {l.name}
                </Button>
              </div>
              {confirm === l.id && (
                <div className="danger-area">
                  <p>¿Eliminar esta lista? Tus juegos se conservarán.</p>
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() => remove(l.id)}
                  >
                    Confirmar eliminación de lista
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirm("")}>
                    Cancelar
                  </Button>
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </section>
  );
}
function Picker({
  state,
  onGame,
}: {
  state: Library;
  onGame: (id: string) => void;
}) {
  const [platform, setPlatform] = useState(""),
    [genre, setGenre] = useState(""),
    [duration, setDuration] = useState(""),
    [mode, setMode] = useState<TimeMode>("main"),
    [chosen, setChosen] = useState("");
  const games = playableGames(state, platform, genre, duration, mode),
    game = games.find((g) => g.id === chosen);
  function choose() {
    const alternatives = games.filter((g) => g.id !== chosen);
    const pool = alternatives.length ? alternatives : games;
    setChosen(pool[Math.floor(Math.random() * pool.length)]?.id ?? "");
  }
  return (
    <section>
      <p className="info-note">
        Elige entre tus pendientes disponibles. Los juegos de deseos quedan
        fuera. La duración es la total aproximada del juego, no la de una
        sesión.
      </p>
      <label>
        Plataforma para jugar
        <select
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setChosen("");
          }}
        >
          <option value="">Cualquiera</option>
          {[...new Set(state.games.flatMap((g) => g.platforms))]
            .sort()
            .map((p) => (
              <option key={p}>{p}</option>
            ))}
        </select>
      </label>
      <label>
        Género para jugar
        <select
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setChosen("");
          }}
        >
          <option value="">Cualquiera</option>
          {[...new Set(state.games.flatMap((g) => g.genres))]
            .sort()
            .map((p) => (
              <option key={p}>{p}</option>
            ))}
        </select>
      </label>
      <label>
        Tipo de duración para jugar
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as TimeMode);
            setChosen("");
          }}
        >
          {Object.entries(timeLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Duración máxima del juego
        <select
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value);
            setChosen("");
          }}
        >
          <option value="">Cualquiera</option>
          <option value="10">Hasta 10 horas</option>
          <option value="30">Hasta 30 horas</option>
          <option value="60">Hasta 60 horas</option>
        </select>
      </label>
      <p role="status">{games.length} juegos compatibles</p>
      {duration && (
        <p className="muted text-xs">
          Se excluyen los juegos sin duración registrada.
        </p>
      )}
      <Button disabled={!games.length} onClick={choose}>
        Elegir un juego al azar
      </Button>
      {game && (
        <div className="personal-list" aria-live="polite">
          <h3>{game.title}</h3>
          <p>
            {game.platforms.join(" · ")} ·{" "}
            {formatHours(estimatedHours(game, mode))}
          </p>
          <Button variant="secondary" onClick={() => onGame(game.id)}>
            Abrir juego elegido
          </Button>
        </div>
      )}
      {!games.length && (
        <p className="info-note">
          No hay pendientes que cumplan estos filtros. Prueba ampliarlos.
        </p>
      )}
    </section>
  );
}
function Compare({
  state,
  onGame,
}: {
  state: Library;
  onGame: (id: string) => void;
}) {
  const [ids, setIds] = useState<string[]>([]),
    [query, setQuery] = useState("");
  const games = ids.flatMap((id) => {
    const g = state.games.find((g) => g.id === id);
    return g ? [g] : [];
  });
  return (
    <section>
      <p className="info-note">
        Selecciona dos o tres juegos de tu biblioteca para decidir cuál empezar.
      </p>
      <label>
        Buscar juegos para comparar
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="planning-options">
        {state.games
          .filter(
            (g) =>
              g.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
              ids.includes(g.id),
          )
          .map((g) => (
            <label key={g.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={ids.includes(g.id)}
                disabled={ids.length === 3 && !ids.includes(g.id)}
                onChange={(e) =>
                  setIds(
                    e.target.checked
                      ? [...ids, g.id]
                      : ids.filter((id) => id !== g.id),
                  )
                }
              />
              {g.title}
            </label>
          ))}
      </div>
      {games.length < 2 ? (
        <p role="status">Elige al menos dos juegos.</p>
      ) : (
        <div
          className="compare-scroll"
          role="region"
          aria-label="Comparación de juegos"
          tabIndex={0}
        >
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Característica</th>
                {games.map((g) => (
                  <th scope="col" key={g.id}>
                    <button className="text-link" onClick={() => onGame(g.id)}>
                      {g.title}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Disponibilidad",
                  ...games.map((g) =>
                    g.wishlist ? "Lista de deseos" : "En mi biblioteca",
                  ),
                ],
                [
                  "Estado",
                  ...games.map(
                    (g) =>
                      state.runs.find((r) => r.id === g.primaryRunId)?.status ??
                      "—",
                  ),
                ],
                ["Plataformas", ...games.map((g) => g.platforms.join(", "))],
                [
                  "Géneros",
                  ...games.map((g) => g.genres.join(", ") || "Sin especificar"),
                ],
                ...(["main", "extras", "complete"] as const).map((mode) => [
                  timeLabels[mode],
                  ...games.map(
                    (g) =>
                      formatHours(estimatedHours(g, mode)) +
                      (g.times?.[mode]
                        ? " · " + g.times[mode]!.source
                        : mode === "main" && g.approximateHours !== undefined
                          ? " · manual"
                          : ""),
                  ),
                ]),
                [
                  "Mi tiempo real (partida principal)",
                  ...games.map((g) => {
                    const r = state.runs.find((r) => r.id === g.primaryRunId);
                    return r?.completionMinutes !== undefined
                      ? Math.floor(r.completionMinutes / 60) +
                          " h " +
                          (r.completionMinutes % 60) +
                          " min"
                      : "Sin registrar";
                  }),
                ],
                [
                  "Mi nota",
                  ...games.map((g) =>
                    g.rating !== undefined ? g.rating + "/10" : "Sin valorar",
                  ),
                ],
                [
                  "Tiendas",
                  ...games.map((g) => g.stores.join(", ") || "Sin especificar"),
                ],
              ].map(([label, ...cells]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {cells.map((cell, i) => (
                    <td key={games[i].id}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
