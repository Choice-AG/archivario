import React, { useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { PENDING_STATUS } from "../lib/model";
import { EmptyState } from "../components/ui/atoms";
import { ItemRow } from "../components/ItemCard";

/* ============================================================
   BACKLOG
   ============================================================ */

export function BacklogView({ items, sagas, onOpenItem, onReorder }) {
  const sagaMap = Object.fromEntries(sagas.map((s) => [s.id, s]));
  const backlog = useMemo(
    () => items.filter((i) => i.status === PENDING_STATUS[i.type]).sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999)),
    [items]
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mt-page-title">Backlog</h1>
        <p className="mt-ink-soft text-sm">{backlog.length} elementos pendientes. Ordénalos por prioridad.</p>
      </div>
      {backlog.length === 0 && <EmptyState text="Tu backlog está vacío. ¡Buen trabajo!" />}
      <div className="mt-card divide-y mt-line">
        {backlog.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-1">
            <div className="flex flex-col shrink-0 pl-2">
              <button disabled={idx === 0} className="mt-icon-btn" onClick={() => onReorder(it, backlog[idx - 1])}><ChevronUp size={14} /></button>
              <button disabled={idx === backlog.length - 1} className="mt-icon-btn" onClick={() => onReorder(it, backlog[idx + 1])}><ChevronDown size={14} /></button>
            </div>
            <span className="mt-mono text-xs mt-ink-soft w-6 text-center shrink-0">#{idx + 1}</span>
            <ItemRow item={it} saga={sagaMap[it.sagaId]} onClick={() => onOpenItem(it)} />
          </div>
        ))}
      </div>
    </div>
  );
}
