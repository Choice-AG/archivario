import React, { useMemo } from "react";
import { Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { EmptyState, Btn } from "../components/ui/atoms";
import { ItemCard, ItemRow } from "../components/ItemCard";
import { LibraryFilterPanel, applyFilters } from "../components/LibraryFilterPanel";

/* ============================================================
   LIBRARY VIEW
   ============================================================ */

export function LibraryView({ items, sagas, filters, setFilters, onResetFilters, display, setDisplay, onOpenItem, onAdd, allTags }) {
  const sagaMap = Object.fromEntries(sagas.map((s) => [s.id, s]));
  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="mt-page-title">Biblioteca</h1>
          <p className="mt-ink-soft text-sm">{filtered.length} de {items.length} elementos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mt-view-toggle">
            <button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")}><LayoutGrid size={15} /></button>
            <button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")}><ListIcon size={15} /></button>
          </div>
          <Btn variant="primary" onClick={onAdd}><Plus size={15} /> Añadir</Btn>
        </div>
      </div>

      <div className="mt-library-layout">
        <LibraryFilterPanel filters={filters} setFilters={setFilters} onReset={onResetFilters} sagas={sagas} allTags={allTags} />

        <div className="flex flex-col gap-4 min-w-0 flex-1">
          {filtered.length === 0 && <EmptyState text="No hay elementos con estos filtros." />}

          {display === "grid" ? (
            <div className="mt-grid">
              {filtered.map((it) => <ItemCard key={it.id} item={it} saga={sagaMap[it.sagaId]} onClick={() => onOpenItem(it)} />)}
            </div>
          ) : (
            <div className="mt-card divide-y mt-line">
              {filtered.map((it) => <ItemRow key={it.id} item={it} saga={sagaMap[it.sagaId]} onClick={() => onOpenItem(it)} showPriority />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
