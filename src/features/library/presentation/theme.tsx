"use client";
import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "archivario-theme";

// Se ejecuta en <head> antes de pintar para evitar un destello del otro tema.
export const themeScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Sin almacenamiento local el tema solo dura esta visita.
  }
}

export function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") setChoice(t);
  }, []);
  return (
    <fieldset className="theme-picker">
      <legend>Apariencia</legend>
      <div className="segmented" role="group" aria-label="Tema de la app">
        {(
          [
            ["system", "Sistema"],
            ["light", "Claro"],
            ["dark", "Oscuro"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={choice === value}
            className={choice === value ? "selected" : ""}
            onClick={() => {
              setChoice(value);
              apply(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
