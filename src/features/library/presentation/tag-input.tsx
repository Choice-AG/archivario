"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { sameTag, TAGS_MAX } from "../domain/model";

// Etiquetas como chips: se escriben (Intro o coma para añadir) o se eligen
// entre las que ya usas en otros juegos.
export function TagInput({
  value,
  onChange,
  suggestions,
  label = "Etiquetas",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  label?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = value.length >= TAGS_MAX;
  // Añade una o varias (separadas por comas) sin repetir ninguna.
  const add = (raw: string) => {
    setDraft("");
    const next = [...value];
    for (const part of raw.split(",")) {
      const tag = part.trim().slice(0, 40);
      if (tag && next.length < TAGS_MAX && !next.some((t) => sameTag(t, tag)))
        next.push(tag);
    }
    if (next.length > value.length) onChange(next);
  };
  const rest = suggestions
    .filter((s) => !value.some((t) => sameTag(t, s)))
    .filter(
      (s) => !draft.trim() || s.toLowerCase().includes(draft.toLowerCase()),
    )
    .slice(0, 10);
  return (
    <fieldset className="tag-input">
      <legend>
        {label} <small>Opcional</small>
      </legend>
      {value.length > 0 && (
        <ul className="tag-chips" aria-label="Etiquetas elegidas">
          {value.map((t) => (
            <li key={t}>
              {t}
              <button
                type="button"
                aria-label={"Quitar la etiqueta " + t}
                onClick={() => onChange(value.filter((x) => x !== t))}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        aria-label="Nueva etiqueta"
        value={draft}
        maxLength={40}
        disabled={full}
        placeholder={full ? "Máximo de etiquetas" : "En pareja, relajante…"}
        onChange={(e) => {
          const text = e.target.value;
          if (text.includes(",")) add(text);
          else setDraft(text);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
      />
      {rest.length > 0 && !full && (
        <div className="tag-suggestions">
          {rest.map((s) => (
            <button
              type="button"
              key={s}
              aria-label={"Añadir la etiqueta " + s}
              onClick={() => add(s)}
            >
              <Plus size={12} /> {s}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
