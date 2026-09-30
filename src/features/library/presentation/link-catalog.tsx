"use client";
import { useState } from "react";
import { Link2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Game } from "../domain/model";
import { useCatalogSearch } from "./use-catalog-search";
import type { ApiRequest, Execute } from "./shared";

// Un juego añadido a mano puede vincularse después con su ficha de IGDB para
// obtener capturas, sinopsis, duración y saga.
export function LinkCatalog({
  game,
  request,
  execute,
  demo,
}: {
  game: Game;
  request: ApiRequest;
  execute: Execute;
  demo: boolean;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const search = useCatalogSearch(request, open && !demo);
  return (
    <section className="game-section link-catalog" id="game-overview">
      <h2>Completa la ficha</h2>
      <p className="muted">
        Este juego se añadió manualmente. Vincúlalo con el catálogo de IGDB para
        ver capturas, sinopsis, duración y otros juegos de su saga.
      </p>
      {demo ? (
        <p className="info-note">
          Inicia sesión para vincular juegos con el catálogo.
        </p>
      ) : !open ? (
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
            search.setQuery(game.title);
          }}
        >
          <Link2 size={16} /> Vincular con IGDB
        </Button>
      ) : (
        <div className="link-catalog-search">
          <label>
            Buscar en el catálogo
            <input
              autoFocus
              value={search.query}
              maxLength={80}
              onChange={(e) => search.setQuery(e.target.value)}
            />
          </label>
          {search.pending && (
            <p role="status" className="muted">
              <LoaderCircle size={14} className="animate-spin" /> Buscando…
            </p>
          )}
          {search.error && <p role="alert">{search.error}</p>}
          <div className="catalog-results">
            {search.results.map((item) => (
              <button
                key={item.catalogId}
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setError("");
                  try {
                    await execute({
                      type: "save-game",
                      game: {
                        ...game,
                        catalogId: item.catalogId,
                        ...(!game.cover && item.cover
                          ? { cover: item.cover }
                          : {}),
                        genres: game.genres.length
                          ? game.genres
                          : item.genres.slice(0, 12),
                      },
                    });
                    setOpen(false);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {item.cover && (
                  <img
                    src={item.cover}
                    alt=""
                    width={40}
                    height={55}
                    loading="lazy"
                  />
                )}
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.platforms.slice(0, 3).join(" · ")}</small>
                </span>
              </button>
            ))}
          </div>
          {search.searched && !search.results.length && (
            <p className="muted">Sin resultados. Prueba con otro nombre.</p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </section>
  );
}
