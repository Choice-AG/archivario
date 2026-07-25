import React, { useMemo } from "react";
import { monthYear } from "../lib/model";
import { EmptyState } from "../components/ui/atoms";
import { ItemRow } from "../components/ItemCard";

/* ============================================================
   TIMELINE
   ============================================================ */

export function TimelineView({ items, sagas, onOpenItem }) {
  const sagaMap = Object.fromEntries(sagas.map((s) => [s.id, s]));
  const done = useMemo(
    () => items.filter((i) => i.endDate).sort((a, b) => new Date(b.endDate) - new Date(a.endDate)),
    [items]
  );
  const groups = useMemo(() => {
    const m = new Map();
    done.forEach((it) => {
      const key = it.endDate.slice(0, 7);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(it);
    });
    return Array.from(m.entries());
  }, [done]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mt-page-title">Línea temporal</h1>
        <p className="mt-ink-soft text-sm">Historial de cuándo completaste cada cosa.</p>
      </div>
      {groups.length === 0 && <EmptyState text="Marca fechas de fin en tus elementos para verlas aquí." />}
      <div className="flex flex-col gap-6">
        {groups.map(([key, list]) => (
          <div key={key} className="flex gap-4">
            <div className="mt-timeline-marker">
              <div className="mt-timeline-dot" />
              <div className="mt-timeline-line" />
            </div>
            <div className="flex-1 pb-2">
              <div className="mt-label mb-2 capitalize">{monthYear(list[0].endDate)}</div>
              <div className="mt-card divide-y mt-line">
                {list.map((it) => <ItemRow key={it.id} item={it} saga={sagaMap[it.sagaId]} onClick={() => onOpenItem(it)} />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
