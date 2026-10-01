"use client";
import { useId, useMemo, useState } from "react";

const common = [
  "Europe/Madrid",
  "Atlantic/Canary",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "UTC",
];
function allZones() {
  try {
    return [...new Set([...common, ...Intl.supportedValuesOf("timeZone")])];
  } catch {
    return common;
  }
}
// "America/Argentina/Buenos_Aires" → "Buenos Aires · America/Argentina".
const readable = (zone: string) => {
  const parts = zone.split("/");
  const city = parts.pop()!.replace(/_/g, " ");
  return parts.length ? city + " · " + parts.join("/") : city;
};
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .toLowerCase();

// Buscador de zonas horarias: escribes una ciudad y eliges de la lista.
export function TimezoneField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const id = useId();
  const zones = useMemo(() => allZones(), []);
  const [value, setValue] = useState(defaultValue),
    [query, setQuery] = useState<string>(),
    [active, setActive] = useState(0);
  const open = query !== undefined;
  const results = useMemo(() => {
    const q = fold(query ?? "");
    return (q ? zones.filter((z) => fold(z).includes(q)) : common).slice(0, 8);
  }, [query, zones]);
  const choose = (zone: string) => {
    setValue(zone);
    setQuery(undefined);
  };
  return (
    <div className="timezone-field">
      <input type="hidden" name={name} value={value} />
      <label htmlFor={id}>Zona horaria</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={id + "-list"}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[active] ? id + "-" + active : undefined
        }
        autoComplete="off"
        value={query ?? readable(value)}
        placeholder="Escribe una ciudad"
        onFocus={(e) => {
          setQuery("");
          setActive(0);
          e.currentTarget.select();
        }}
        onBlur={() => setQuery(undefined)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + step + results.length) % results.length);
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setQuery(undefined);
          }
        }}
      />
      {open && (
        <ul id={id + "-list"} role="listbox" className="timezone-list">
          {results.length ? (
            results.map((z, i) => (
              <li
                key={z}
                id={id + "-" + i}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(z);
                }}
              >
                {readable(z)}
              </li>
            ))
          ) : (
            <li className="muted">Ninguna zona coincide.</li>
          )}
        </ul>
      )}
    </div>
  );
}
