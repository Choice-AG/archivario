"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Library } from "../domain/model";
import { moveGame, moveToTop, priorityGames } from "../domain/planning";
import { Cover, type Execute } from "./shared";

// Ordena a mano lo que quieres jugar antes. Lo nuevo entra al final.
export function PriorityEditor({
  state,
  execute,
  onClose,
}: {
  state: Library;
  execute: Execute;
  onClose: () => void;
}) {
  const [ids, setIds] = useState(() => priorityGames(state).map((g) => g.id)),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const games = new Map(state.games.map((g) => [g.id, g]));
  if (!ids.length)
    return (
      <p className="info-note">
        Cuando tengas juegos pendientes o próximos podrás ordenarlos aquí.
      </p>
    );
  return (
    <div className="priority-editor">
      <p className="muted text-sm">
        Arriba, lo que más te apetece jugar. Este orden se usa en Próximos y en
        «¿A qué juego esta noche?».
      </p>
      <ol className="priority-list">
        {ids.map((id, i) => {
          const g = games.get(id)!;
          return (
            <li key={id}>
              <span className="priority-place">{i + 1}</span>
              <Cover game={g} />
              <span className="priority-title">
                {g.title}
                {g.wishlist && <small>Lista de deseos</small>}
              </span>
              <span className="priority-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Poner primero " + g.title}
                  title="Poner primero"
                  disabled={i === 0}
                  onClick={() => setIds(moveToTop(ids, i))}
                >
                  <ChevronsUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Subir " + g.title}
                  title="Subir"
                  disabled={i === 0}
                  onClick={() => setIds(moveGame(ids, i, -1))}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={"Bajar " + g.title}
                  title="Bajar"
                  disabled={i === ids.length - 1}
                  onClick={() => setIds(moveGame(ids, i, 1))}
                >
                  <ArrowDown size={16} />
                </Button>
              </span>
            </li>
          );
        })}
      </ol>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions priority-save">
        <Button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError("");
            try {
              await execute({ type: "save-priority", gameIds: ids });
              onClose();
            } catch (e) {
              setError((e as Error).message);
              setPending(false);
            }
          }}
        >
          Guardar el orden
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
