"use client";
import { useEffect, useRef } from "react";

export const shortcuts = [
  ["N", "Añadir un juego"],
  ["/", "Buscar en tu biblioteca"],
  ["D", "Registrar el día de hoy"],
  ["Ctrl K", "Buscar en todo Archivario"],
  ["?", "Ver estos atajos"],
] as const;

// Atajos de una tecla. No se activan al escribir en un campo, con un modal
// abierto ni con teclas modificadoras (salvo Mayús para «?»).
export function useShortcuts(
  enabled: boolean,
  actions: Record<"n" | "/" | "d" | "?", () => void>,
) {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable=true], [role=dialog], [role=menu]",
        )
      )
        return;
      const key = e.key.toLowerCase() as keyof typeof actions;
      const action = latest.current[key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export function ShortcutList() {
  return (
    <dl className="shortcut-list">
      {shortcuts.map(([key, label]) => (
        <div key={key}>
          <dt>
            <kbd>{key}</kbd>
          </dt>
          <dd>{label}</dd>
        </div>
      ))}
    </dl>
  );
}
