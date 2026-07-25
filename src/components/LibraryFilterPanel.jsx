import React from "react";
import { Search } from "lucide-react";
import { TYPE_CONFIG, TYPE_LIST, PRIORITY_LEVELS, DEFAULT_PRIORITY } from "../lib/model";
import { TSelect, Btn } from "./ui/atoms";

export const DEFAULT_LIBRARY_FILTERS = {
  search: "", types: [], statuses: [], priorities: [], sagaId: "all", tag: "all", minScore: "0",
};

function FilterSection({ title, children }) {
  return (
    <div className="mt-filter-section">
      <div className="mt-label mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function LibraryFilterPanel({ filters, setFilters, onReset, sagas, allTags }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const toggle = (k, v) => setFilters((f) => {
    const arr = f[k];
    return { ...f, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
  });

  const statusOptions = filters.types.length
    ? Array.from(new Map(filters.types.flatMap((t) => TYPE_CONFIG[t].statuses).map((s) => [s.v, s])).values())
    : Array.from(new Map(TYPE_LIST.flatMap((t) => TYPE_CONFIG[t].statuses).map((s) => [s.v, s])).values());

  return (
    <aside className="mt-filter-panel">
      <div className="mt-search-box">
        <Search size={15} />
        <input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Buscar por título..."
          className="mt-search-input"
        />
      </div>
      <Btn variant="ghost" onClick={onReset}>Limpiar filtros</Btn>

      <FilterSection title="Tipos de contenido">
        {TYPE_LIST.map((t) => (
          <button
            key={t} type="button" onClick={() => toggle("types", t)}
            className={`mt-type-chip ${filters.types.includes(t) ? "mt-type-chip-active" : ""}`}
          >
            {TYPE_CONFIG[t].plural}
          </button>
        ))}
      </FilterSection>

      <FilterSection title="Estado">
        {statusOptions.map((s) => (
          <button
            key={s.v} type="button" onClick={() => toggle("statuses", s.v)}
            className={`mt-type-chip ${filters.statuses.includes(s.v) ? "mt-type-chip-active" : ""}`}
          >
            {s.l}
          </button>
        ))}
      </FilterSection>

      <FilterSection title="Prioridad">
        {PRIORITY_LEVELS.map((p) => (
          <button
            key={p.v} type="button" onClick={() => toggle("priorities", p.v)}
            className={`mt-type-chip ${filters.priorities.includes(p.v) ? "mt-type-chip-active" : ""}`}
          >
            {p.l}
          </button>
        ))}
      </FilterSection>

      {allTags.length > 0 && (
        <FilterSection title="Etiquetas">
          <TSelect value={filters.tag} onChange={(e) => set("tag", e.target.value)}>
            <option value="all">Cualquier tag</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </TSelect>
        </FilterSection>
      )}

      <FilterSection title="Saga">
        <TSelect value={filters.sagaId} onChange={(e) => set("sagaId", e.target.value)}>
          <option value="all">Cualquier saga</option>
          <option value="none">Sin saga</option>
          {sagas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </TSelect>
      </FilterSection>

      <FilterSection title="Nota mínima">
        <TSelect value={filters.minScore} onChange={(e) => set("minScore", e.target.value)}>
          <option value="0">Cualquiera</option>
          {[9, 8, 7, 6, 5, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
        </TSelect>
      </FilterSection>
    </aside>
  );
}

export function applyFilters(items, filters) {
  return items.filter((it) => {
    if (filters.types.length && !filters.types.includes(it.type)) return false;
    if (filters.statuses.length && !filters.statuses.includes(it.status)) return false;
    if (filters.priorities.length && !filters.priorities.includes(it.priorityLevel || DEFAULT_PRIORITY)) return false;
    if (filters.sagaId === "none" && it.sagaId) return false;
    else if (filters.sagaId !== "all" && filters.sagaId !== "none" && it.sagaId !== filters.sagaId) return false;
    if (filters.tag !== "all" && !(it.tags || []).includes(filters.tag)) return false;
    if (Number(filters.minScore) > 0 && !(Number(it.score) >= Number(filters.minScore))) return false;
    if (filters.search && !it.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}
