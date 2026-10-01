"use client";
import { useRef, useState } from "react";
import { Link2, LoaderCircle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bestMatch, type CatalogOption } from "../domain/catalog-match";
import type { Game, Library } from "../domain/model";
import { plural } from "./format";
import type { ApiRequest, Execute } from "./shared";

type Row = {
  game: Game;
  phase: "pending" | "searching" | "done" | "error";
  options: CatalogOption[];
  choice?: number;
  exact?: boolean;
};
// El catálogo admite 20 búsquedas por minuto: se deja algo de margen.
const PAUSE_MS = 3500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const unlinkedGames = (state: Library) =>
  state.games.filter((g) => !g.catalogId);

// Busca en IGDB cada juego añadido a mano y propone su ficha.
export function BulkLink({
  state,
  request,
  execute,
  onDone,
}: {
  state: Library;
  request: ApiRequest;
  execute: Execute;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    unlinkedGames(state).map((game) => ({
      game,
      phase: "pending",
      options: [],
    })),
  );
  const [running, setRunning] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [waiting, setWaiting] = useState("");
  const stop = useRef(false);
  const patch = (id: string, change: Partial<Row>) =>
    setRows((all) =>
      all.map((r) => (r.game.id === id ? { ...r, ...change } : r)),
    );

  async function search() {
    stop.current = false;
    setRunning(true);
    setError("");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (stop.current) break;
      if (row.phase === "done") continue;
      patch(row.game.id, { phase: "searching" });
      try {
        const res = await request(
          "/api/catalog?q=" +
            encodeURIComponent(row.game.title.slice(0, 80)) +
            "&page=1",
        );
        const { items } = (await res.json()) as { items: CatalogOption[] };
        const match = bestMatch(row.game.title, items);
        patch(row.game.id, {
          phase: "done",
          options: items.slice(0, 5),
          choice: match?.option.catalogId,
          exact: match?.exact,
        });
      } catch (e) {
        const message = (e as Error).message;
        patch(row.game.id, { phase: "error" });
        if (/minuto/.test(message)) {
          // Límite alcanzado: se espera y se reintenta este mismo juego.
          setWaiting("Pausa de un minuto por el límite del catálogo…");
          await sleep(60000);
          setWaiting("");
          patch(row.game.id, { phase: "pending" });
          i--;
          continue;
        }
        setError(message);
      }
      await sleep(PAUSE_MS);
    }
    setRunning(false);
  }

  const chosen = rows.filter((r) => r.phase === "done" && r.choice);
  const searched = rows.filter((r) => r.phase === "done").length;
  return (
    <section className="bulk-link">
      <p className="info-note">
        {plural(rows.length, "juego no tiene", "juegos no tienen")} ficha de
        IGDB. Busca coincidencias, revisa las propuestas y vincúlalas de una
        vez. Las búsquedas van despacio para respetar el límite del catálogo.
      </p>
      <div className="form-actions">
        {running ? (
          <Button variant="secondary" onClick={() => (stop.current = true)}>
            <Square size={14} /> Detener
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={!rows.length || searched === rows.length}
            onClick={search}
          >
            <Link2 size={16} />
            {searched ? "Seguir buscando" : "Buscar coincidencias"}
          </Button>
        )}
        <span className="muted text-xs" role="status">
          {searched}/{rows.length} revisados
          {waiting && " · " + waiting}
        </span>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <ul className="bulk-link-list">
        {rows.map((r) => (
          <li key={r.game.id}>
            <strong>{r.game.title}</strong>
            {r.phase === "searching" && (
              <span className="muted">
                <LoaderCircle size={13} className="animate-spin" /> Buscando…
              </span>
            )}
            {r.phase === "pending" && <span className="muted">Pendiente</span>}
            {r.phase === "error" && (
              <span className="muted">Sin respuesta</span>
            )}
            {r.phase === "done" &&
              (r.options.length ? (
                <label className="bulk-link-choice">
                  <span className="sr-only">Ficha para {r.game.title}</span>
                  <select
                    value={r.choice ?? ""}
                    onChange={(e) =>
                      patch(r.game.id, {
                        choice: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                        exact: false,
                      })
                    }
                  >
                    <option value="">No vincular</option>
                    {r.options.map((o) => (
                      <option key={o.catalogId} value={o.catalogId}>
                        {o.title}
                        {o.platforms.length
                          ? " · " + o.platforms.slice(0, 2).join(", ")
                          : ""}
                      </option>
                    ))}
                  </select>
                  {r.choice && (
                    <small>
                      {r.exact ? "Coincidencia exacta" : "Revisa la propuesta"}
                    </small>
                  )}
                </label>
              ) : (
                <span className="muted">Sin resultados</span>
              ))}
          </li>
        ))}
      </ul>
      <Button
        disabled={!chosen.length || saving || running}
        onClick={async () => {
          setSaving(true);
          setError("");
          try {
            await execute({
              type: "link-catalog",
              items: chosen.map((r) => {
                const o = r.options.find((x) => x.catalogId === r.choice)!;
                return {
                  gameId: r.game.id,
                  catalogId: o.catalogId,
                  ...(o.cover ? { cover: o.cover } : {}),
                  genres: o.genres.slice(0, 12),
                };
              }),
            });
            onDone();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        Vincular {plural(chosen.length, "juego", "juegos")}
      </Button>
    </section>
  );
}
