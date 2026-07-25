import React, { useState } from "react";
import { Search } from "lucide-react";
import { TInput, Btn } from "../components/ui/atoms";

export function ExternalSearch({ placeholder, search, onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doSearch = async (e) => {
    e.preventDefault();
    if (!q.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await search(q.trim());
      setResults(data);
    } catch (err) {
      setError("No se pudo buscar. Inténtalo de nuevo en unos segundos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-subtle-box p-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <TInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doSearch(e); }}
          placeholder={placeholder}
        />
        <Btn type="button" variant="subtle" onClick={doSearch}>
          <Search size={14} /> {loading ? "Buscando…" : "Buscar"}
        </Btn>
      </div>
      {error && <p className="text-xs mt-accent-text">{error}</p>}
      {results.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
          {results.map((r) => (
            <button
              type="button"
              key={r.externalId}
              onClick={() => onPick(r)}
              className="mt-card p-1.5 text-left flex flex-col gap-1"
            >
              {r.cover ? (
                <img src={r.cover} alt={r.title} className="w-full aspect-[3/4] object-cover rounded" loading="lazy" />
              ) : (
                <div className="w-full aspect-[3/4] mt-cover-fallback rounded" />
              )}
              <span className="text-[11px] leading-tight line-clamp-2">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
