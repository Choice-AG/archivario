"use client";
import { StatusOptions } from "./format";
import { useEffect, useState, useSyncExternalStore } from "react";
const noSubscribe = () => () => {};
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCatalogSearch } from "./use-catalog-search";
import { Modal, type ApiRequest, type Execute } from "./shared";
import { type Library, type Status } from "../domain/model";
import { useSagaGuides } from "./saga-guides";
import { useSagaSearch } from "./use-api";
export function GlobalSearch({
  state,
  request,
  demo,
  onGame,
  onSaga,
}: {
  state: Library;
  request: ApiRequest;
  demo: boolean;
  onGame: (id: string) => void;
  onSaga: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const shortcut = useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K"),
    () => "Ctrl K",
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const guides = useSagaGuides(open) ?? [];
  const search = useCatalogSearch(request, open && !demo);
  const q = search.query.trim().toLocaleLowerCase("es");
  const sagaSearch = useSagaSearch(request, q, open && !demo);
  const remoteSagas = sagaSearch.items,
    sagaError = sagaSearch.error;
  const games = state.games.filter((g) =>
    g.title.toLocaleLowerCase("es").includes(q),
  );
  const sagas = [
    ...(state.sagas ?? []),
    ...guides.filter((g) => !state.sagas?.some((s) => s.id === g.id)),
  ].filter((s) => s.name.toLocaleLowerCase("es").includes(q));
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-label="Buscar en Archivario"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search size={15} />
        <span className="search-label">Buscar en Archivario</span>
        <kbd className="shortcut-hint" aria-hidden="true">
          {shortcut}
        </kbd>
      </Button>
      {open && (
        <Modal
          title="Buscar juegos y sagas"
          description="En tu biblioteca, en las guías de sagas y en el catálogo."
          onClose={() => setOpen(false)}
        >
          <label>
            Buscar en todo
            <input
              autoFocus
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              placeholder="Un juego, una saga…"
              maxLength={80}
            />
          </label>
          {q && (
            <div className="global-results">
              <h3>Tu biblioteca</h3>
              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setOpen(false);
                    onGame(g.id);
                  }}
                >
                  {g.title}
                  <small>En tu biblioteca</small>
                </button>
              ))}
              {!games.length && (
                <p className="muted">Sin coincidencias en tu biblioteca.</p>
              )}
              <h3>Sagas</h3>
              {!sagas.length && !remoteSagas.length && (
                <p className="muted">Ninguna saga con ese nombre.</p>
              )}
              {sagas.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setOpen(false);
                    onSaga(s.id);
                  }}
                >
                  {s.name}
                  <small>{s.entries.length} títulos</small>
                </button>
              ))}
              {remoteSagas
                .filter((r) => !sagas.some((s) => s.id === "igdb-" + r.id))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setOpen(false);
                      onSaga("igdb-" + s.id);
                    }}
                  >
                    {s.name}
                    <small>Saga de IGDB</small>
                  </button>
                ))}
              {sagaError && <p role="alert">{sagaError}</p>}
              <h3>Catálogo de juegos</h3>
              {demo ? (
                <p className="muted">
                  Inicia sesión para buscar también en IGDB.
                </p>
              ) : (
                <>
                  {search.pending && <p role="status">Buscando…</p>}
                  {search.error && <p role="alert">{search.error}</p>}
                  {search.results.map((g) => {
                    const own = state.games.find(
                      (x) => x.catalogId === g.catalogId,
                    );
                    return (
                      <button
                        key={g.catalogId}
                        onClick={() => {
                          setOpen(false);
                          onGame(own?.id ?? "igdb-" + g.catalogId);
                        }}
                      >
                        {g.cover && <img src={g.cover} alt="" />}
                        <span>
                          {g.title}
                          <small>
                            {own ? "En tu biblioteca" : "Explorar ficha"}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                  {search.searched && !search.results.length && (
                    <p>Sin resultados en el catálogo.</p>
                  )}
                  {search.searched && (
                    <div className="form-actions">
                      <Button
                        disabled={search.page === 1}
                        onClick={() => search.goToPage(search.page - 1)}
                      >
                        Anterior
                      </Button>
                      <span>Página {search.page}</span>
                      <Button
                        disabled={
                          search.results.length < 20 || search.page === 10
                        }
                        onClick={() => search.goToPage(search.page + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
export function BatchLibrary({
  state,
  ids,
  execute,
  today,
  onDone,
}: {
  state: Library;
  ids: string[];
  execute: Execute;
  today: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<Status>("pendiente"),
    [list, setList] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(kind: "status" | "list") {
    setBusy(true);
    setError("");
    try {
      await execute(
        kind === "status"
          ? { type: "batch-status", gameIds: ids, status, date: today }
          : { type: "batch-list", gameIds: ids, listId: list },
      );
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="batch-toolbar">
      <strong>{ids.length} seleccionados</strong>
      <label>
        Estado para la selección
        <select
          aria-label="Estado para la selección"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          <StatusOptions />
        </select>
      </label>
      <Button disabled={busy || !ids.length} onClick={() => save("status")}>
        Aplicar estado
      </Button>
      <label>
        Añadir a una lista
        <select
          aria-label="Lista para la selección"
          value={list}
          onChange={(e) => setList(e.target.value)}
        >
          <option value="">Elige una lista</option>
          {state.lists?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={busy || !ids.length || !list}
        onClick={() => save("list")}
      >
        Añadir selección a lista
      </Button>
      {!state.lists?.length && (
        <p className="muted">
          Crea una lista en «Listas y planes» para agrupar la selección.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
