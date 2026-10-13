"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Library } from "../domain/model";
import { allTags } from "../domain/organize";
import { plural } from "./format";
import type { Execute } from "./shared";

// Renombrar o quitar una etiqueta de todos los juegos a la vez.
export function TagManager({
  state,
  execute,
  pending,
  run,
}: {
  state: Library;
  execute: Execute;
  pending: boolean;
  run: (task: () => Promise<string>) => void;
}) {
  const tags = allTags(state);
  const [editing, setEditing] = useState<string>(),
    [draft, setDraft] = useState(""),
    [confirm, setConfirm] = useState<string>();
  if (!tags.length)
    return (
      <p className="muted text-sm">
        Todavía no usas etiquetas. Añádelas al editar un juego o a varios a la
        vez con «Seleccionar juegos».
      </p>
    );
  return (
    <ul className="tag-manager">
      {tags.map((t) => (
        <li key={t.name}>
          {editing === t.name ? (
            <form
              className="tag-rename"
              onSubmit={(e) => {
                e.preventDefault();
                const to = draft.trim();
                if (!to) return;
                run(async () => {
                  await execute({ type: "rename-tag", from: t.name, to });
                  setEditing(undefined);
                  return "Etiqueta renombrada.";
                });
              }}
            >
              <label>
                <span className="sr-only">Nuevo nombre de {t.name}</span>
                <input
                  autoFocus
                  maxLength={40}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </label>
              <Button size="sm" disabled={pending || !draft.trim()}>
                Guardar
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <>
              <span className="tag-name">{t.name}</span>
              <small className="muted">
                {plural(t.count, "juego", "juegos")}
              </small>
              <Button
                size="sm"
                variant="ghost"
                aria-label={"Renombrar la etiqueta " + t.name}
                onClick={() => {
                  setEditing(t.name);
                  setDraft(t.name);
                  setConfirm(undefined);
                }}
              >
                <Pencil size={14} />
              </Button>
              {confirm === t.name ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await execute({ type: "rename-tag", from: t.name });
                      setConfirm(undefined);
                      return "Etiqueta quitada de todos los juegos.";
                    })
                  }
                >
                  Quitar de {plural(t.count, "juego", "juegos")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={"Quitar la etiqueta " + t.name}
                  onClick={() => setConfirm(t.name)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
