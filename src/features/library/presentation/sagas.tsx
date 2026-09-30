"use client";
import { useEffect, useState } from "react";
import { EditionPicker } from "./edition-picker";
import { Button } from "@/components/ui/button";
import { Modal, type ApiRequest, type Execute } from "./shared";
import type { Library, Saga, SagaEntry } from "../domain/model";
import artworkData from "../infrastructure/saga-artworks.json";
import { useSagaGuides } from "./saga-guides";
const artworks: Record<string, string> = artworkData;
function sagaImage(s: Saga) {
  return (
    artworks[s.id] ??
    s.entries.find((e) => e.cover)?.cover?.replace("/t_cover_big/", "/t_1080p/")
  );
}
function SagaArt({ saga, hero = false }: { saga: Saga; hero?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = sagaImage(saga);
  return src && !failed ? (
    <img
      src={src}
      alt=""
      loading={hero ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : null;
}

import { sagaGame, sagaCompleted, sagaOrder } from "../domain/sagas";
const labels = {
  release: "Orden de lanzamiento",
  story: "Cronología de la historia",
  recommended: "Orden recomendado",
};
export function Sagas({
  state,
  request,
  execute,
  demo,
  selectedId,
  onSelect,
  onGame,
}: {
  state: Library;
  request: ApiRequest;
  execute: Execute;
  demo: boolean;
  selectedId?: string;
  onSelect: (id?: string) => void;
  onGame: (id: string) => void;
}) {
  const [hideCompleted, setHideCompleted] = useState(false),
    [hideOptional, setHideOptional] = useState(false);
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<{ id: number; name: string }[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState<Saga>(),
    [preview, setPreview] = useState<Saga>(),
    [release, setRelease] = useState(false),
    [confirm, setConfirm] = useState(false),
    [draftKeys, setDraftKeys] = useState<string[]>([]);
  const loadedGuides = useSagaGuides(),
    guides = loadedGuides ?? [];
  function openDraft(s: Saga) {
    setDraftKeys(s.entries.map(() => crypto.randomUUID()));
    setDraft(s);
  }
  function moveDraftEntry(i: number, j: number) {
    if (!draft) return;
    const entries = [...draft.entries],
      keys = [...draftKeys];
    [entries[i], entries[j]] = [entries[j], entries[i]];
    [keys[i], keys[j]] = [keys[j], keys[i]];
    setDraftKeys(keys);
    setDraft({ ...draft, entries });
  }
  const saved = (state.sagas ?? []).map((s) => ({
      ...s,
      entries: s.entries.map((e) => ({
        ...e,
        alternatives:
          e.alternatives ??
          guides
            .find((g) => g.id === s.id)
            ?.entries.find((x) => x.catalogId === e.catalogId)?.alternatives,
      })),
    })),
    saga =
      saved.find((s) => s.id === selectedId) ??
      (preview?.id === selectedId ? preview : undefined) ??
      guides.find((s) => s.id === selectedId);
  const hasSaga = !!saga;
  useEffect(() => {
    if (!selectedId || hasSaga || demo || !/^igdb-[1-9]\d*$/.test(selectedId))
      return;
    const c = new AbortController();
    setBusy(true);
    setError("");
    request("/api/catalog/sagas?id=" + selectedId.slice(5), {
      signal: c.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!c.signal.aborted) setPreview(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => {
      c.abort();
      // Sin esto, salir durante la carga dejaba los botones deshabilitados.
      setBusy(false);
    };
  }, [selectedId, hasSaga, demo, request]);
  useEffect(() => {
    setRelease(false);
    setConfirm(false);
  }, [selectedId]);
  useEffect(() => {
    if (demo || query.trim().length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    let active = true;
    const c = new AbortController();
    setLoading(true);
    setItems([]);
    setError("");
    const t = setTimeout(() => {
      request("/api/catalog/sagas?q=" + encodeURIComponent(query.trim()), {
        signal: c.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          if (active) setItems(d.items);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      c.abort();
      clearTimeout(t);
    };
  }, [query, request, demo]);
  async function load(id: number) {
    setBusy(true);
    setError("");
    try {
      const found = saved.find((s) => s.id === "igdb-" + id);
      if (found) {
        onSelect(found.id);
        return;
      }
      const data = (await (
        await request("/api/catalog/sagas?id=" + id)
      ).json()) as Saga;
      setPreview(data);
      onSelect(data.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function fromLibrary() {
    openDraft({
      id: crypto.randomUUID(),
      name: "",
      description: "",
      order: "recommended",
      source: "Guía personal",
      entries: [],
    });
  }
  const save = async (s: Saga) => {
    setBusy(true);
    setError("");
    try {
      await execute({ type: "save-saga", saga: s });
      setPreview(undefined);
      setDraft(undefined);
      setDraftKeys([]);
      onSelect(s.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const entries = saga
      ? sagaOrder(release ? { ...saga, order: "release" } : saga)
      : [],
    complete = entries.filter((e) => sagaCompleted(state, e)).length;
  const visible = entries
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) =>
        (!hideCompleted || !sagaCompleted(state, entry)) &&
        (!hideOptional || !entry.optional),
    );
  const next = entries.findIndex(
    (e) => !e.optional && !sagaCompleted(state, e),
  );
  return (
    <div className="sagas-page">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {selectedId && saga ? (
        <>
          <button className="game-back" onClick={() => onSelect(undefined)}>
            ← Volver a Sagas
          </button>
          <header className="saga-hero">
            <div className="saga-collage" aria-hidden="true">
              <SagaArt key={saga.id} saga={saga} hero />
            </div>
            <div className="saga-hero-content">
              <p className="eyebrow">UN UNIVERSO, MUCHAS HISTORIAS</p>
              <h1>{saga.name}</h1>
              <p>{saga.description}</p>
              <div className="saga-badges">
                <span>{entries.length} títulos</span>
                <span>{complete} completados</span>
                <span>{labels[saga.order]}</span>
              </div>
              <div className="form-actions">
                <Button
                  disabled={busy}
                  onClick={() => openDraft(structuredClone(saga))}
                >
                  Editar guía
                </Button>
                {!saved.some((s) => s.id === saga.id) && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => save(saga)}
                  >
                    Guardar saga
                  </Button>
                )}
                {saved.some((s) => s.id === saga.id) && (
                  <Button
                    variant="secondary"
                    onClick={() => onSelect(undefined)}
                  >
                    Ver mis sagas
                  </Button>
                )}
              </div>
              {saved.some((s) => s.id === saga.id) ? (
                <p className="saga-save-status" role="status">
                  ✓ Guardada en Mis sagas
                  {demo ? " · Solo en este navegador" : ""}. Puedes encontrarla
                  en Sagas o desde tu biblioteca.
                </p>
              ) : (
                <p className="saga-save-hint">
                  Guardar esta guía la añade a Mis sagas. Los juegos se añaden
                  por separado desde sus fichas.
                </p>
              )}
            </div>
          </header>
          <div className="saga-toolbar">
            <div>
              <strong>
                Tu recorrido · {complete}/{entries.length}
              </strong>
              <progress
                aria-label="Progreso de la saga"
                value={complete}
                max={entries.length || 1}
              />
            </div>
            {saga.order !== "release" && (
              <label>
                Ver orden
                <select
                  aria-label="Ver orden"
                  value={release ? "release" : "guide"}
                  onChange={(e) => setRelease(e.target.value === "release")}
                >
                  <option value="guide">{labels[saga.order]}</option>
                  <option value="release">Orden de lanzamiento</option>
                </select>
              </label>
            )}
          </div>
          <p className="saga-source">
            {release
              ? "Ordenado por las fechas de lanzamiento registradas."
              : saga.source
                  .replace(/https?:\/\/[^\s]+/g, "")
                  .replace(/[\s·,;:-]+$/, "")
                  .trim() || "Guía personal sin fuente indicada"}
            {saga.order === "release" || release
              ? " El lanzamiento no determina el orden narrativo."
              : " · Recomendación de recorrido; no es una cronología universal."}
          </p>
          <div className="saga-sources">
            {(saga.source.match(/https?:\/\/[^\s]+/g) ?? []).map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                Fuente {i + 1} ↗
              </a>
            ))}
          </div>
          <details className="saga-map">
            <summary>Guía visual del recorrido</summary>
            <ol>
              {entries.map((e, i) => (
                <li key={i}>
                  <a href={"#saga-entry-" + i}>{e.title}</a>
                  {e.optional && <small>Opcional</small>}
                </li>
              ))}
            </ol>
          </details>
          <div className="saga-filters">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
              />
              Ocultar completados
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hideOptional}
                onChange={(e) => setHideOptional(e.target.checked)}
              />
              Ocultar opcionales
            </label>
            {next >= 0 && (
              <a className="text-link" href={"#saga-entry-" + next}>
                Ir al siguiente juego →
              </a>
            )}
          </div>
          <div className="saga-timeline">
            {visible.map(({ entry: e, index: i }) => {
              const g = sagaGame(state, e),
                done = sagaCompleted(state, e);
              return (
                <div key={i}>
                  {e.chapter && <h2 className="saga-chapter">{e.chapter}</h2>}
                  <article
                    className={"saga-step " + (i === next ? "saga-next" : "")}
                    id={"saga-entry-" + i}
                  >
                    <aside>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <p>{e.note || "Tu siguiente paso en esta historia."}</p>
                    </aside>
                    <a
                      className={
                        "saga-game saga-game-link " +
                        (done ? "is-complete" : "")
                      }
                      href={
                        "/juegos/" +
                        encodeURIComponent(g?.id ?? "igdb-" + e.catalogId) +
                        (demo ? "?demo=1" : "")
                      }
                      onClick={(ev) => {
                        if (
                          ev.button === 0 &&
                          !ev.ctrlKey &&
                          !ev.metaKey &&
                          !ev.shiftKey &&
                          !ev.altKey
                        ) {
                          ev.preventDefault();
                          onGame(g?.id ?? "igdb-" + e.catalogId);
                        }
                      }}
                    >
                      {e.cover && <img src={e.cover} alt="" loading="lazy" />}
                      <div>
                        <h3>{e.title}</h3>
                        {i === next && (
                          <p className="next-step-label">Tu siguiente juego</p>
                        )}
                        <div className="saga-badges">
                          <span>
                            {e.releaseDate
                              ? e.releaseDate.slice(0, 4)
                              : "Sin fecha"}
                          </span>
                          {e.optional && <span>Opcional</span>}
                          <span>
                            {done
                              ? "✓ Completado"
                              : g
                                ? "En tu biblioteca"
                                : "Por descubrir"}
                          </span>
                        </div>
                        <span className="text-link">
                          {g ? "Abrir mi ficha" : "Ver información del juego"} →
                        </span>
                      </div>
                    </a>
                    {!!e.alternatives?.length && (
                      <div className="saga-alternatives">
                        <strong>
                          Elige una versión; no necesitas completar ambas.
                        </strong>
                        {e.alternatives.map((a) => (
                          <button
                            key={a.catalogId}
                            onClick={() =>
                              onGame(
                                state.games.find(
                                  (g) => g.catalogId === a.catalogId,
                                )?.id ?? "igdb-" + a.catalogId,
                              )
                            }
                          >
                            {a.title} →
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
          {!entries.length && (
            <p className="info-note">
              Todavía no hay títulos. Edita la guía para añadir juegos de tu
              biblioteca.
            </p>
          )}
          {saved.some((s) => s.id === saga.id) && (
            <div className="danger-area">
              <Button variant="ghost" onClick={() => setConfirm(!confirm)}>
                Eliminar esta guía
              </Button>
              {confirm && (
                <>
                  <p>
                    Se eliminará la guía, pero conservarás todos tus juegos y
                    partidas.
                  </p>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await execute({ type: "delete-saga", id: saga.id });
                        setPreview(undefined);
                        onSelect(undefined);
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Confirmar eliminación de saga
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      ) : selectedId ? (
        <section className="empty-state">
          <h1>
            {busy || !loadedGuides ? "Cargando saga…" : "Saga no guardada"}
          </h1>
          <p>Vuelve a buscarla o abre una de tus guías.</p>
          <Button onClick={() => onSelect(undefined)}>Volver a Sagas</Button>
        </section>
      ) : (
        <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">CADA SAGA, UN VIAJE</p>
              <h1>Historias que merecen un recorrido.</h1>
              <p>Descubre sus juegos, elige un orden y sigue tu progreso.</p>
            </div>
            <Button onClick={fromLibrary}>Crear guía</Button>
          </section>
          {!demo && (
            <label>
              Buscar sagas en IGDB
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={80}
                placeholder="Kingdom Hearts, Zelda, Metal Gear…"
              />
            </label>
          )}
          {demo && (
            <p className="info-note">
              Puedes crear guías con los juegos de la demostración. Inicia
              sesión para buscar sagas en IGDB.
            </p>
          )}
          {loading && query.length >= 2 && <p role="status">Buscando sagas…</p>}
          <div className="saga-search-results">
            {items.map((s) => (
              <button disabled={busy} key={s.id} onClick={() => load(s.id)}>
                {s.name}
                <span>Explorar →</span>
              </button>
            ))}
          </div>
          <section className="saved-sagas" aria-labelledby="saved-sagas-title">
            <h2 id="saved-sagas-title" className="saga-library-title">
              Mis sagas
            </h2>
            <p className="muted">
              Tus guías guardadas. Guardar una saga no añade sus juegos a la
              biblioteca.
            </p>
            <div className="saga-library">
              {saved.map((s) => {
                const done = s.entries.filter((e) =>
                  sagaCompleted(state, e),
                ).length;
                return (
                  <button
                    className="saga-tile"
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                  >
                    <SagaArt saga={s} />
                    <div>
                      <span>{labels[s.order]}</span>
                      <h3>{s.name}</h3>
                      <p>
                        {done} / {s.entries.length} completados
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {!saved.length && (
              <p className="info-note">
                Aún no has guardado ninguna saga. Explora las guías de abajo y
                pulsa «Guardar saga».
              </p>
            )}
          </section>
          <h2 className="saga-library-title">Guías para empezar</h2>
          <p className="muted">
            Siete recorridos preparados para ti. Ábrelos, consulta sus notas y
            guarda los que quieras personalizar.
          </p>
          <div className="saga-library">
            {guides.map((s) => (
              <button
                className="saga-tile"
                key={s.id}
                onClick={() => onSelect(s.id)}
              >
                <SagaArt saga={s} />
                <div>
                  <span>{s.entries.length} títulos · Guía recomendada</span>
                  <h3>{s.name}</h3>
                  <p>
                    {saved.some((x) => x.id === s.id)
                      ? "✓ Guardada · Abrir mi guía →"
                      : "Explorar recorrido →"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {draft && (
        <Modal
          title="Editar guía de saga"
          description="Ordena los juegos y añade capítulos y notas sin spoilers."
          onClose={() => setDraft(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(draft);
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Nombre de la saga
                <input
                  value={draft.name}
                  maxLength={100}
                  required
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Descripción de la saga
                <textarea
                  aria-label="Descripción de la saga"
                  value={draft.description}
                  maxLength={3000}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label>
                Tipo de orden
                <select
                  value={draft.order}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      order: e.target.value as Saga["order"],
                    })
                  }
                >
                  {Object.entries(labels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fuente o criterio de la guía
                <input
                  value={draft.source}
                  maxLength={500}
                  placeholder="Fuente consultada o tu criterio personal"
                  onChange={(e) =>
                    setDraft({ ...draft, source: e.target.value })
                  }
                />
              </label>
              <p className="info-note">
                El orden de lanzamiento se calcula por fecha. Para ordenar a
                mano elige cronología o recomendado.
              </p>
              {draft.entries.map((e, i) => (
                <details className="saga-entry-editor" key={draftKeys[i] ?? i}>
                  <summary>
                    {i + 1}. {e.title}
                  </summary>
                  <div className="form-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={i === 0 || draft.order === "release"}
                      onClick={() => moveDraftEntry(i, i - 1)}
                    >
                      Subir
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={
                        i === draft.entries.length - 1 ||
                        draft.order === "release"
                      }
                      onClick={() => moveDraftEntry(i, i + 1)}
                    >
                      Bajar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setDraftKeys(draftKeys.filter((_, n) => n !== i));
                        setDraft({
                          ...draft,
                          entries: draft.entries.filter((_, n) => n !== i),
                        });
                      }}
                    >
                      Quitar título
                    </Button>
                  </div>
                  {(["chapter", "note", "releaseDate"] as const).map((key) => (
                    <label key={key}>
                      {key === "chapter"
                        ? "Capítulo o bloque"
                        : key === "note"
                          ? "Nota de este paso"
                          : "Fecha de lanzamiento"}
                      <input
                        type={key === "releaseDate" ? "date" : "text"}
                        value={e[key]}
                        maxLength={key === "chapter" ? 100 : 1500}
                        onChange={(ev) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((x, n) =>
                              n === i ? { ...x, [key]: ev.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  <EditionPicker
                    entry={e}
                    state={state}
                    request={request}
                    demo={demo}
                    onChange={(entry) =>
                      setDraft({
                        ...draft,
                        entries: draft.entries.map((x, n) =>
                          n === i ? entry : x,
                        ),
                      })
                    }
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={e.optional}
                      onChange={(ev) =>
                        setDraft({
                          ...draft,
                          entries: draft.entries.map((x, n) =>
                            n === i ? { ...x, optional: ev.target.checked } : x,
                          ),
                        })
                      }
                    />{" "}
                    Opcional
                  </label>
                </details>
              ))}
              <label>
                Añadir juego de mi biblioteca
                <select
                  value=""
                  onChange={(e) => {
                    const g = state.games.find((g) => g.id === e.target.value);
                    if (!g) return;
                    const entry: SagaEntry = {
                      ...(g.catalogId ? { catalogId: g.catalogId } : {}),
                      gameId: g.id,
                      title: g.title,
                      ...(g.cover ? { cover: g.cover } : {}),
                      releaseDate: "",
                      chapter: "",
                      note: "",
                      optional: false,
                    };
                    setDraftKeys([...draftKeys, crypto.randomUUID()]);
                    setDraft({ ...draft, entries: [...draft.entries, entry] });
                  }}
                >
                  <option value="">Elige un juego</option>
                  {state.games
                    .filter(
                      (g) =>
                        !draft.entries.some((e) =>
                          e.catalogId
                            ? e.catalogId === g.catalogId
                            : e.gameId === g.id,
                        ),
                    )
                    .map((g) => (
                      <option value={g.id} key={g.id}>
                        {g.title}
                      </option>
                    ))}
                </select>
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <Button>Guardar guía</Button>
            </fieldset>
          </form>
        </Modal>
      )}
    </div>
  );
}
