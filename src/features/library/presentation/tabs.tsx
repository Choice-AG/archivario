"use client";
import { useSyncExternalStore } from "react";

// La pestaña vive en el fragmento de la URL (#partidas…): se puede enlazar y
// el botón Atrás del navegador vuelve a la anterior.
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
export function useHashTab<T extends string>(
  ids: readonly T[],
): [T, (tab: T) => void] {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab = (ids as readonly string[]).includes(hash) ? (hash as T) : ids[0];
  return [
    tab,
    (next) => {
      if (next !== tab) window.location.hash = next;
    },
  ];
}

// Barra de pestañas de una ficha, fija al desplazarse y manejable con flechas.
export function GameTabs<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onSelect: (tab: T) => void;
}) {
  return (
    <div
      className="game-tabs"
      role="tablist"
      aria-label="Secciones de la ficha"
      onKeyDown={(e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const i = tabs.findIndex((t) => t.id === active);
        const next = tabs[(i + step + tabs.length) % tabs.length].id;
        onSelect(next);
        document.getElementById("tab-" + next)?.focus();
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          id={"tab-" + t.id}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={"panel-" + t.id}
          tabIndex={active === t.id ? 0 : -1}
          className={active === t.id ? "active" : ""}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
          {!!t.count && <small>{t.count}</small>}
        </button>
      ))}
    </div>
  );
}
