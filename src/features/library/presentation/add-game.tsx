"use client";
import { useEffect, useState } from "react";
import { Check, LoaderCircle, Plus, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dateInZone,
  statuses,
  type Game,
  type GameTimes,
  type Library,
  type Run,
} from "../domain/model";
import type { ApiRequest, Execute } from "./app";
import { platformChoices, preferredPlatforms } from "./catalog-data";
import { useCatalogSearch, type CatalogGame } from "./use-catalog-search";

const value = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const list = (s: string) => [
  ...new Set(
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];

export function AddGame({
  state,
  execute,
  request,
  onClose,
  demo,
  initialGame,
  onAdded,
}: {
  state: Library;
  execute: Execute;
  request: ApiRequest;
  onClose: () => void;
  demo: boolean;
  initialGame?: CatalogGame;
  onAdded?: (id: string) => void;
}) {
  const [times, setTimes] = useState<GameTimes>(),
    [timeLoading, setTimeLoading] = useState(false),
    [timeNotice, setTimeNotice] = useState("");
  const [selected, setSelected] = useState<CatalogGame | undefined>(
    initialGame,
  );
  const [manual, setManual] = useState(false);
  const [platforms, setPlatforms] = useState(
    initialGame
      ? preferredPlatforms(
          initialGame.platforms,
          state.games.flatMap((g) => g.platforms),
        ).join(", ")
      : "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const search = useCatalogSearch(request, !demo && !manual && !selected);
  useEffect(() => {
    setTimes(undefined);
    setTimeNotice("");
    if (!selected || demo) {
      setTimeLoading(false);
      return;
    }
    const c = new AbortController();
    let active = true;
    setTimeLoading(true);
    request("/api/catalog/times?id=" + selected.catalogId, { signal: c.signal })
      .then((r) => r.json())
      .then((data: GameTimes) => {
        if (active) {
          setTimes(data);
          setTimeNotice(
            Object.keys(data).length
              ? "Tiempos de IGDB incluidos. Podrás ajustarlos en la pestaña Tiempos."
              : "IGDB no tiene estimaciones de tiempo para este juego.",
          );
        }
      })
      .catch(() => {
        if (active)
          setTimeNotice(
            "No se han podido cargar los tiempos. Puedes consultarlos después desde la ficha.",
          );
      })
      .finally(() => {
        if (active) setTimeLoading(false);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [selected, demo, request]);
  const select = (game: CatalogGame) => {
    setSelected(game);
    setPlatforms(
      preferredPlatforms(
        game.platforms,
        state.games.flatMap((g) => g.platforms),
      ).join(", "),
    );
    setError("");
  };
  const togglePlatform = (name: string) => {
    const current = list(platforms);
    setPlatforms(
      (current.includes(name)
        ? current.filter((p) => p !== name)
        : [...current, name]
      ).join(", "),
    );
  };
  return (
    <div>
      <div className="segmented">
        <button
          className={!manual ? "selected" : ""}
          onClick={() => {
            setManual(false);
            setError("");
          }}
        >
          Buscar en IGDB
        </button>
        <button
          className={manual ? "selected" : ""}
          onClick={() => {
            setManual(true);
            setSelected(undefined);
            setPlatforms("");
            setError("");
          }}
        >
          Añadir manualmente
        </button>
      </div>
      {!manual && !selected && (
        <>
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              search.searchNow();
            }}
          >
            <input
              aria-label="Buscar en IGDB"
              aria-describedby="catalog-search-help"
              placeholder="Escribe el nombre de un juego…"
              minLength={2}
              maxLength={80}
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              required
              autoComplete="off"
            />
            <Button
              disabled={
                search.pending || demo || search.query.trim().length < 2
              }
              aria-label="Buscar catálogo"
            >
              <Search size={18} />
            </Button>
          </form>
          <p id="catalog-search-help" className="muted text-xs mt-3">
            Los resultados aparecen mientras escribes, a partir de dos
            caracteres.
          </p>
          {demo && (
            <p className="info-note">
              La demostración no conecta con IGDB. Puedes probar «Añadir
              manualmente». Inicia sesión para buscar en el catálogo.
            </p>
          )}
          <div
            role="status"
            aria-live="polite"
            className="catalog-search-status"
          >
            {search.pending ? (
              <>
                <LoaderCircle size={16} className="animate-spin" /> Buscando
                juegos…
              </>
            ) : search.searched ? (
              search.results.length ? (
                search.results.length + " resultados en esta página."
              ) : (
                "No hay resultados. Prueba otro nombre o añádelo manualmente."
              )
            ) : null}
          </div>
          <div className="catalog-results" aria-busy={search.pending}>
            {search.results.map((game) => (
              <button key={game.catalogId} onClick={() => select(game)}>
                {game.cover && <img src={game.cover} alt="" />}
                <span>
                  <strong>{game.title}</strong>
                  <small>{platformChoices(game.platforms).join(" · ")}</small>
                </span>
                <Plus size={18} />
              </button>
            ))}
          </div>
          {search.searched && (
            <div className="pagination">
              <Button
                variant="secondary"
                disabled={search.page === 1 || search.pending}
                onClick={() => search.goToPage(search.page - 1)}
              >
                Anterior
              </Button>
              <span>Página {search.page}</span>
              <Button
                variant="secondary"
                disabled={
                  search.results.length < 20 ||
                  search.page === 10 ||
                  search.pending
                }
                onClick={() => search.goToPage(search.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
          {search.error && (
            <p className="form-error" role="alert">
              {search.error}
            </p>
          )}
        </>
      )}
      {(manual || selected) && (
        <>
          {selected && (
            <div className="catalog-selection">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(undefined);
                  setError("");
                }}
              >
                <ArrowLeft size={15} /> Volver a los resultados
              </Button>
              <div className="catalog-selection-summary">
                {selected.cover && (
                  <img
                    src={selected.cover}
                    alt={"Portada de " + selected.title}
                  />
                )}
                <div>
                  <strong>{selected.title}</strong>
                  <p className="muted text-xs">
                    Título, portada y géneros del catálogo. Puedes ajustar los
                    datos antes de guardar.
                  </p>
                </div>
              </div>
            </div>
          )}
          <form
            key={selected?.catalogId ?? "manual"}
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError("");
              const form = new FormData(e.currentTarget),
                id = crypto.randomUUID(),
                runId = crypto.randomUUID(),
                chosen = list(platforms);
              const game: Game = {
                id,
                ...(times ? { times } : {}),
                title: value(form, "title"),
                genres: list(value(form, "genres")),
                platforms: chosen,
                wishlist: form.has("wishlist"),
                stores: list(value(form, "stores")),
                favorite: false,
                next: false,
                review: "",
                spoilerNote: "",
                primaryRunId: runId,
                updatedAt: new Date().toISOString(),
                ...(selected
                  ? {
                      catalogId: selected.catalogId,
                      ...(selected.cover ? { cover: selected.cover } : {}),
                    }
                  : {}),
                ...(value(form, "duration")
                  ? { approximateHours: Number(form.get("duration")) }
                  : {}),
              };
              const status = value(form, "status") as Run["status"],
                startedOn = dateInZone(new Date(), state.profile.timezone);
              try {
                await execute({
                  type: "save-game",
                  game,
                  run: {
                    id: runId,
                    gameId: id,
                    label: "Primera partida",
                    platform: chosen[0] ?? "",
                    status,
                    completion: "sin especificar",
                    startedOn,
                    ...(status === "completado"
                      ? { completedOn: startedOn }
                      : {}),
                    whereLeft: "",
                  },
                });
                onClose();
                onAdded?.(id);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "No se ha podido guardar.",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Título
              <input
                name="title"
                defaultValue={selected?.title}
                maxLength={160}
                required
              />
            </label>
            {selected && selected.platforms.length > 0 && (
              <fieldset className="platform-suggestions">
                <legend>¿En qué plataformas lo juegas?</legend>
                <div>
                  {platformChoices(selected.platforms).map((p) => (
                    <button
                      type="button"
                      key={p}
                      aria-pressed={list(platforms).includes(p)}
                      onClick={() => togglePlatform(p)}
                    >
                      {list(platforms).includes(p) && <Check size={13} />} {p}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="form-grid">
              <label>
                Plataformas{" "}
                <small>Separadas por comas; puedes editar la selección</small>
                <input
                  name="platforms"
                  value={platforms}
                  onChange={(e) => setPlatforms(e.target.value)}
                  placeholder="PC, Switch"
                  maxLength={200}
                  required
                />
              </label>
              <label>
                Tiendas <small>Opcional</small>
                <input
                  name="stores"
                  placeholder="Steam, Nintendo eShop"
                  maxLength={200}
                />
              </label>
            </div>
            <label>
              Géneros <small>Separados por comas</small>
              <input
                name="genres"
                defaultValue={selected?.genres.join(", ")}
                placeholder="Aventura, RPG"
                maxLength={300}
              />
            </label>
            <div className="form-grid">
              <label>
                Estado inicial
                <select name="status">
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Duración aproximada (h){" "}
                <small>Opcional, referencia del juego</small>
                <input
                  name="duration"
                  type="number"
                  min={0}
                  max={10000}
                  step={0.5}
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" name="wishlist" /> Lista de deseos (aún no
              lo tengo)
            </label>
            <p className="muted text-xs" role="status">
              {timeLoading ? "Consultando tiempos de IGDB…" : timeNotice}
            </p>
            <Button disabled={saving || timeLoading} className="w-full mt-3">
              <Plus size={16} /> Añadir a mi biblioteca
            </Button>
          </form>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
