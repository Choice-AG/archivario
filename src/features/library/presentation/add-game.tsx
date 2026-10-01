"use client";
import { useMemo, useState } from "react";
import { useCatalogTimes } from "./use-api";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dateInZone,
  type Game,
  type GameTimes,
  type Library,
  type Run,
} from "../domain/model";
import type { ApiRequest, Execute } from "./shared";
import {
  platformChoices,
  platformLabel,
  preferredPlatforms,
} from "./catalog-data";
import { useCatalogSearch, type CatalogGame } from "./use-catalog-search";
import { list } from "./form-utils";
import { CriticScore } from "./critic-score";

// «¿Cómo lo llevas?»: el estado inicial, con la lista de deseos como una
// opción más (aún no lo tienes).
const progress = [
  { id: "deseo", label: "Lo quiero", hint: "Aún no lo tengo" },
  { id: "pendiente", label: "Pendiente", hint: "Lo tengo sin empezar" },
  { id: "jugando", label: "Jugando", hint: "Ahora mismo" },
  { id: "completado", label: "Completado", hint: "Ya lo terminé" },
  { id: "en pausa", label: "En pausa", hint: "Lo dejé un tiempo" },
  { id: "abandonado", label: "Abandonado", hint: "No era para mí" },
] as const;
type Progress = (typeof progress)[number]["id"];
const commonPlatforms = ["PC", "PS5", "Switch", "Xbox Series X/S"];

export function AddGame({
  state,
  execute,
  request,
  onClose,
  demo,
  initialGame,
  onAdded,
  onOpen,
}: {
  state: Library;
  execute: Execute;
  request: ApiRequest;
  onClose: () => void;
  demo: boolean;
  initialGame?: CatalogGame;
  // Tras añadir, ir directamente a la ficha (desde la ficha del catálogo).
  onAdded?: (id: string) => void;
  // Abrir un juego de la biblioteca (el recién añadido o uno que ya tenías).
  onOpen?: (id: string) => void;
}) {
  const [step, setStep] = useState<"search" | "details" | "done">(
    initialGame ? "details" : "search",
  );
  const [selected, setSelected] = useState(initialGame);
  const [added, setAdded] = useState<Game>();
  const search = useCatalogSearch(request, !demo && step === "search");
  const owned = useMemo(
    () =>
      new Map(
        state.games.flatMap((g) => (g.catalogId ? [[g.catalogId, g]] : [])),
      ),
    [state.games],
  );
  const reset = () => {
    setSelected(undefined);
    setAdded(undefined);
    setStep("search");
  };

  if (step === "done" && added)
    return (
      <div className="add-done">
        <span className="add-done-check" aria-hidden="true">
          <Check size={22} />
        </span>
        <p role="status">
          <strong>{added.title}</strong> ya está en tu biblioteca.
        </p>
        <div className="form-actions">
          {onOpen && (
            <Button onClick={() => onOpen(added.id)}>
              Ver la ficha <ChevronRight size={16} />
            </Button>
          )}
          <Button variant="secondary" onClick={reset}>
            <Plus size={16} /> Añadir otro juego
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    );

  if (step === "details")
    return (
      <GameSetup
        key={selected?.catalogId ?? "manual"}
        state={state}
        execute={execute}
        request={request}
        demo={demo}
        game={selected}
        initialTitle={selected ? undefined : search.query.trim()}
        onBack={initialGame ? undefined : reset}
        onSaved={(game) => {
          if (onAdded) {
            onClose();
            onAdded(game.id);
            return;
          }
          setAdded(game);
          setStep("done");
        }}
      />
    );

  return (
    <div className="add-search">
      <form
        className="add-search-field"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          search.searchNow();
        }}
      >
        <Search size={18} aria-hidden="true" />
        <input
          aria-label="Buscar un juego"
          placeholder="Escribe el nombre de un juego…"
          minLength={2}
          maxLength={80}
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        {search.pending && (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        )}
      </form>
      {demo && (
        <p className="info-note">
          La demostración no busca en el catálogo. Puedes añadir un juego a
          mano; al iniciar sesión verás portadas, géneros y duración.
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className="muted text-xs add-search-status"
      >
        {search.pending
          ? "Buscando juegos…"
          : search.searched
            ? search.results.length
              ? ""
              : "No hay resultados con ese nombre."
            : demo
              ? ""
              : "Escribe al menos dos letras para buscar en el catálogo."}
      </p>
      {search.results.length > 0 && (
        <ul className="add-results" aria-busy={search.pending}>
          {search.results.map((game) => {
            const mine = owned.get(game.catalogId);
            return (
              <li key={game.catalogId}>
                <button
                  className="add-result"
                  onClick={() => {
                    if (mine) {
                      if (onOpen) onOpen(mine.id);
                      return;
                    }
                    setSelected(game);
                    setStep("details");
                  }}
                  aria-label={
                    mine
                      ? game.title + ": ya lo tienes, abrir su ficha"
                      : "Elegir " + game.title
                  }
                >
                  <span className="add-result-cover">
                    {game.cover ? <img src={game.cover} alt="" /> : null}
                  </span>
                  <span className="add-result-text">
                    <strong>{game.title}</strong>
                    <small>
                      {platformChoices(game.platforms).slice(0, 4).join(" · ")}
                    </small>
                  </span>
                  {game.critic && <CriticScore critic={game.critic} compact />}
                  {mine ? (
                    <span className="add-owned">
                      <Check size={14} /> Ya lo tienes
                    </span>
                  ) : (
                    <ChevronRight size={18} aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {search.searched && (search.page > 1 || search.results.length >= 20) && (
        <div className="add-pages">
          <button
            className="text-link"
            disabled={search.page === 1 || search.pending}
            onClick={() => search.goToPage(search.page - 1)}
          >
            ← Anteriores
          </button>
          <button
            className="text-link"
            disabled={
              search.results.length < 20 || search.page === 10 || search.pending
            }
            onClick={() => search.goToPage(search.page + 1)}
          >
            Más resultados →
          </button>
        </div>
      )}
      {search.error && (
        <p className="form-error" role="alert">
          {search.error}
        </p>
      )}
      <div className="add-manual">
        <span>
          {search.searched ? "¿No aparece?" : "¿No está en el catálogo?"}
        </span>
        <Button variant="secondary" onClick={() => setStep("details")}>
          Añádelo a mano
        </Button>
      </div>
    </div>
  );
}

// Paso 2: lo esencial en dos preguntas; el resto, plegado y opcional.
function GameSetup({
  state,
  execute,
  request,
  demo,
  game,
  initialTitle,
  onBack,
  onSaved,
}: {
  state: Library;
  execute: Execute;
  request: ApiRequest;
  demo: boolean;
  game?: CatalogGame;
  initialTitle?: string;
  onBack?: () => void;
  onSaved: (game: Game) => void;
}) {
  const yours = state.games.flatMap((g) => g.platforms).map(platformLabel);
  const usual = [...new Set(yours)]
    .sort(
      (a, b) =>
        yours.filter((p) => p === b).length -
        yours.filter((p) => p === a).length,
    )
    .slice(0, 4);
  const [choices, setChoices] = useState(() =>
    [
      ...new Set([
        ...(game ? platformChoices(game.platforms) : []),
        ...usual,
        ...(game ? [] : commonPlatforms),
      ]),
    ].slice(0, 12),
  );
  const [platforms, setPlatforms] = useState<string[]>(() =>
    game ? preferredPlatforms(game.platforms, yours) : usual.slice(0, 1),
  );
  const [other, setOther] = useState("");
  const [status, setStatus] = useState<Progress>("pendiente");
  const [title, setTitle] = useState(game?.title ?? initialTitle ?? "");
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const timesQuery = useCatalogTimes(request, game?.catalogId, !demo);
  const times: GameTimes | undefined = timesQuery.data;
  const toggle = (p: string) =>
    setPlatforms((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
    );
  const addOther = () => {
    const names = list(other);
    if (!names.length) return;
    setChoices((cur) => [...new Set([...cur, ...names])]);
    setPlatforms((cur) => [...new Set([...cur, ...names])]);
    setOther("");
  };
  return (
    <form
      className="add-setup"
      onSubmit={async (e) => {
        e.preventDefault();
        const chosen = [...new Set([...platforms, ...list(other)])];
        if (!title.trim()) return setError("Escribe el título del juego.");
        if (!chosen.length) return setError("Elige al menos una plataforma.");
        setSaving(true);
        setError("");
        const form = new FormData(e.currentTarget),
          id = crypto.randomUUID(),
          runId = crypto.randomUUID(),
          wishlist = status === "deseo",
          runStatus: Run["status"] = wishlist ? "pendiente" : status,
          duration = String(form.get("duration") ?? "").trim(),
          startedOn = dateInZone(new Date(), state.profile.timezone);
        const saved: Game = {
          id,
          ...(times && Object.keys(times).length ? { times } : {}),
          title: title.trim(),
          genres: list(
            String(form.get("genres") ?? game?.genres.join(", ") ?? ""),
          ),
          platforms: chosen,
          wishlist,
          stores: list(String(form.get("stores") ?? "")),
          favorite: false,
          next: false,
          review: "",
          spoilerNote: "",
          primaryRunId: runId,
          updatedAt: new Date().toISOString(),
          ...(game
            ? {
                catalogId: game.catalogId,
                ...(game.cover ? { cover: game.cover } : {}),
                ...(game.critic ? { critic: game.critic } : {}),
              }
            : {}),
          ...(duration ? { approximateHours: Number(duration) } : {}),
        };
        try {
          await execute({
            type: "save-game",
            game: saved,
            run: {
              id: runId,
              gameId: id,
              label: "Primera partida",
              platform: chosen[0],
              status: runStatus,
              completion: "sin especificar",
              startedOn,
              ...(runStatus === "completado" ? { completedOn: startedOn } : {}),
              whereLeft: "",
            },
          });
          onSaved(saved);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "No se ha podido guardar.",
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      {onBack && (
        <button type="button" className="game-back add-back" onClick={onBack}>
          <ArrowLeft size={15} />{" "}
          {game ? "Elegir otro juego" : "Volver a buscar"}
        </button>
      )}
      {game ? (
        <div className="add-chosen">
          <span className="add-result-cover">
            {game.cover && <img src={game.cover} alt="" />}
          </span>
          <div>
            <strong>{game.title}</strong>
            <small>{game.genres.slice(0, 3).join(" · ")}</small>
          </div>
        </div>
      ) : (
        <label>
          Título
          <input
            name="title"
            value={title}
            maxLength={160}
            autoFocus
            required
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}

      <fieldset className="add-question">
        <legend>¿En qué lo juegas?</legend>
        <div className="choice-chips">
          {choices.map((p) => (
            <button
              type="button"
              key={p}
              aria-pressed={platforms.includes(p)}
              onClick={() => toggle(p)}
            >
              {platforms.includes(p) && <Check size={13} />} {p}
            </button>
          ))}
        </div>
        <div className="add-other">
          <label className="sr-only" htmlFor="add-other-platform">
            Otra plataforma
          </label>
          <input
            id="add-other-platform"
            value={other}
            maxLength={60}
            placeholder="Otra plataforma…"
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOther();
              }
            }}
          />
          <Button type="button" variant="ghost" size="sm" onClick={addOther}>
            <Plus size={14} /> Añadir
          </Button>
        </div>
      </fieldset>

      <fieldset className="add-question">
        <legend>¿Cómo lo llevas?</legend>
        <div
          className="progress-choices"
          role="radiogroup"
          aria-label="¿Cómo lo llevas?"
        >
          {progress.map((p) => (
            <button
              type="button"
              key={p.id}
              role="radio"
              aria-checked={status === p.id}
              className={"progress-" + p.id.replace(" ", "-")}
              onClick={() => setStatus(p.id)}
            >
              <strong>{p.label}</strong>
              <small>{p.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <details className="add-more">
        <summary>Más detalles (opcional)</summary>
        {game && (
          <label>
            Título
            <input
              name="title"
              value={title}
              maxLength={160}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        )}
        <div className="form-grid">
          <label>
            Tiendas
            <input
              name="stores"
              placeholder="Steam, Nintendo eShop"
              maxLength={200}
            />
          </label>
          <label>
            Duración aproximada (h)
            <input
              name="duration"
              type="number"
              min={0}
              max={10000}
              step={0.5}
            />
          </label>
        </div>
        <label>
          Géneros <small>Separados por comas</small>
          <input
            name="genres"
            defaultValue={game?.genres.join(", ")}
            placeholder="Aventura, RPG"
            maxLength={300}
          />
        </label>
        {game && (
          <p className="muted text-xs" role="status">
            {timesQuery.loading
              ? "Consultando la duración en IGDB…"
              : times && Object.keys(times).length
                ? "La duración de IGDB se guardará con el juego."
                : ""}
          </p>
        )}
      </details>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={saving} className="w-full mt-2">
        <Plus size={16} /> Añadir a mi biblioteca
      </Button>
    </form>
  );
}
