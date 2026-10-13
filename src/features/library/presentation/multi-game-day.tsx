"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Library } from "../domain/model";
import type { Execute } from "./shared";
import { DurationInput } from "./duration-input";
export function MultiGameDay({
  state,
  date,
  execute,
  onDone,
}: {
  state: Library;
  date: string;
  execute: Execute;
  onDone: () => void;
}) {
  const [items, setItems] = useState<
      Record<string, { runId: string; note: string; minutes?: number }>
    >({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await execute({
            type: "save-day",
            date,
            items: Object.entries(items).map(([gameId, v]) => ({
              gameId,
              ...v,
            })),
          });
          onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="info-note">
        Selecciona los juegos y revisa sus notas. Los registros de los juegos no
        seleccionados se conservan.
      </p>
      <label>
        Filtrar juegos del día
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <fieldset disabled={busy}>
        {state.games
          .filter((g) => g.title.toLowerCase().includes(query.toLowerCase()))
          .map((g) => {
            const item = items[g.id],
              existing = state.activities.find(
                (a) => a.gameId === g.id && a.date === date,
              );
            return (
              <div className="multi-day-game" key={g.id}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!item}
                    onChange={(e) => {
                      if (e.target.checked)
                        setItems({
                          ...items,
                          [g.id]: {
                            runId: existing?.runId ?? g.primaryRunId,
                            note: existing?.note ?? "",
                            ...(existing?.minutes
                              ? { minutes: existing.minutes }
                              : {}),
                          },
                        });
                      else {
                        const next = { ...items };
                        delete next[g.id];
                        setItems(next);
                      }
                    }}
                  />
                  {g.title}
                  {existing ? " · Ya registrado" : ""}
                </label>
                {item && (
                  <>
                    <label>
                      Partida de {g.title}
                      <select
                        value={item.runId}
                        onChange={(e) =>
                          setItems({
                            ...items,
                            [g.id]: { ...item, runId: e.target.value },
                          })
                        }
                      >
                        {state.runs
                          .filter((r) => r.gameId === g.id)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label} · {r.platform}
                            </option>
                          ))}
                      </select>
                    </label>
                    <DurationInput
                      label={"Tiempo de " + g.title}
                      value={item.minutes}
                      onChange={(minutes) => {
                        const next = { ...item };
                        delete next.minutes;
                        setItems({
                          ...items,
                          [g.id]: minutes ? { ...next, minutes } : next,
                        });
                      }}
                    />
                    <label>
                      Nota para {g.title}
                      <textarea
                        aria-label={"Nota para " + g.title}
                        value={item.note}
                        maxLength={1000}
                        onChange={(e) =>
                          setItems({
                            ...items,
                            [g.id]: { ...item, note: e.target.value },
                          })
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            );
          })}
        <Button disabled={busy || !Object.keys(items).length}>
          Guardar {Object.keys(items).length} juegos del día
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
