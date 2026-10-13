"use client";
import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import type { Game } from "../domain/model";
import { useApi } from "./use-api";
import type { ApiRequest, Execute } from "./shared";

// Elige otra portada de IGDB: la de otra región o la de otra edición.
export function CoverPicker({
  game,
  request,
  execute,
  onClose,
}: {
  game: Game;
  request: ApiRequest;
  execute: Execute;
  onClose: () => void;
}) {
  const { data, error, loading, retry } = useApi<{
    items: { url: string; label: string }[];
  }>(
    request,
    game.catalogId ? "/api/catalog/covers?id=" + game.catalogId : null,
  );
  const [pending, setPending] = useState(""),
    [failed, setFailed] = useState("");
  const items = [
    // Una portada que no viene de esta ficha (p. ej., de Steam) se conserva.
    ...(game.cover && !data?.items.some((i) => i.url === game.cover)
      ? [{ url: game.cover, label: "La que tienes ahora" }]
      : []),
    ...(data?.items ?? []),
  ];
  if (loading)
    return (
      <p className="muted" role="status">
        <LoaderCircle size={14} className="animate-spin" /> Buscando portadas…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="form-error">
        {error}{" "}
        <button className="text-link" onClick={retry}>
          Reintentar
        </button>
      </p>
    );
  return (
    <div>
      {items.length <= 1 && (
        <p className="info-note">
          IGDB no tiene otras portadas para este juego.
        </p>
      )}
      <ul className="cover-options" aria-label="Portadas disponibles">
        {items.map((item) => {
          const current = item.url === game.cover;
          return (
            <li key={item.url}>
              <button
                aria-pressed={current}
                aria-label={"Usar la portada: " + item.label}
                disabled={!!pending}
                onClick={async () => {
                  if (current) return onClose();
                  setPending(item.url);
                  setFailed("");
                  try {
                    await execute({
                      type: "save-game",
                      game: { ...game, cover: item.url },
                    });
                    onClose();
                  } catch (e) {
                    setFailed((e as Error).message);
                    setPending("");
                  }
                }}
              >
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span>
                  {current && <Check size={13} />} {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {failed && (
        <p role="alert" className="form-error">
          {failed}
        </p>
      )}
    </div>
  );
}
