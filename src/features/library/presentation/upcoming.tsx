"use client";
import { useEffect } from "react";
import { CalendarClock } from "lucide-react";
import type { Library } from "../domain/model";
import { releaseCandidates, releaseLabel, releases } from "../domain/releases";
import { useApi } from "./use-api";
import { Cover, type ApiRequest } from "./shared";
import { formatDate } from "./format";

export type ReleaseUpdate = {
  gameId: string;
  catalogId: number;
  releaseDate: string;
};

// Consulta en IGDB las fechas de lo que esperas (una vez al día, con caché
// compartida) y avisa de las que han cambiado para guardarlas.
function useReleaseSync(
  state: Library,
  today: string,
  request: ApiRequest,
  enabled: boolean,
  onUpdate: (items: ReleaseUpdate[]) => void,
) {
  const candidates = releaseCandidates(state, today);
  const ids = candidates.map((g) => g.catalogId!).sort((a, b) => a - b);
  const { data } = useApi<{
    items: { catalogId: number; releaseDate: string }[];
  }>(
    request,
    enabled && ids.length ? "/api/catalog/releases?ids=" + ids.join(",") : null,
  );
  const changed = (data?.items ?? []).flatMap((item) => {
    const game = state.games.find((g) => g.catalogId === item.catalogId);
    return game && (game.releaseDate ?? "") !== item.releaseDate
      ? [{ gameId: game.id, ...item }]
      : [];
  });
  const key = changed.map((c) => c.gameId + c.releaseDate).join();
  useEffect(() => {
    if (changed.length) onUpdate(changed);
    // Solo cuando cambia lo que hay que guardar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function UpcomingReleases({
  state,
  today,
  request,
  demo,
  onUpdate,
  onGame,
}: {
  state: Library;
  today: string;
  request: ApiRequest;
  demo: boolean;
  onUpdate: (items: ReleaseUpdate[]) => void;
  onGame: (id: string) => void;
}) {
  useReleaseSync(state, today, request, !demo, onUpdate);
  const { upcoming, recent } = releases(state, today);
  if (!upcoming.length && !recent.length) return null;
  return (
    <section className="releases" aria-labelledby="releases-title">
      <div className="section-header">
        <h2 id="releases-title">
          <CalendarClock size={18} aria-hidden="true" /> Próximos lanzamientos
        </h2>
      </div>
      <ul className="release-list">
        {[...recent, ...upcoming].map((g) => (
          <li key={g.id}>
            <button
              className="release-item"
              onClick={() => onGame(g.id)}
              aria-label={
                g.title +
                ": " +
                releaseLabel(g.releaseDate!, today) +
                " (" +
                formatDate(g.releaseDate) +
                ")"
              }
            >
              <Cover game={g} />
              <span>
                <strong>{g.title}</strong>
                <small>{formatDate(g.releaseDate)}</small>
                <em className={g.releaseDate! <= today ? "released" : ""}>
                  {g.releaseDate! < today
                    ? "Ya disponible · " + releaseLabel(g.releaseDate!, today)
                    : releaseLabel(g.releaseDate!, today)}
                </em>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
