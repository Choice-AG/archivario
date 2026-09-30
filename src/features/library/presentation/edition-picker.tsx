"use client";
import { useCatalogSearch } from "./use-catalog-search";
import type { ApiRequest } from "./app";
import type { SagaEntry, Library } from "../domain/model";
export function EditionPicker({
  entry,
  state,
  request,
  demo,
  onChange,
}: {
  entry: SagaEntry;
  state: Library;
  request: ApiRequest;
  demo: boolean;
  onChange: (entry: SagaEntry) => void;
}) {
  const search = useCatalogSearch(request, !demo);
  function add(catalogId: number, title: string) {
    if (
      (entry.alternatives?.length ?? 0) >= 12 ||
      catalogId === entry.catalogId ||
      entry.alternatives?.some((a) => a.catalogId === catalogId)
    )
      return;
    onChange({
      ...entry,
      alternatives: [...(entry.alternatives ?? []), { catalogId, title }],
    });
    search.setQuery("");
  }
  return (
    <fieldset>
      <legend>Ediciones alternativas para este paso</legend>
      <p className="info-note">
        Elige versiones que puedas jugar como alternativa. Completar cualquiera
        cuenta una sola vez; no añadas secuelas ni DLC independientes.
      </p>
      {entry.alternatives?.map((a) => (
        <div className="edition-row" key={a.catalogId}>
          <span>{a.title}</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...entry,
                alternatives: entry.alternatives?.filter(
                  (x) => x.catalogId !== a.catalogId,
                ),
              })
            }
          >
            Quitar alternativa
          </button>
        </div>
      ))}
      <label>
        Vincular edición de mi biblioteca
        <select
          aria-label="Vincular edición de mi biblioteca"
          value=""
          onChange={(e) => {
            const g = state.games.find((g) => g.id === e.target.value);
            if (g?.catalogId) add(g.catalogId, g.title);
          }}
        >
          <option value="">Elige una edición</option>
          {state.games
            .filter(
              (g) =>
                g.catalogId &&
                g.catalogId !== entry.catalogId &&
                !entry.alternatives?.some((a) => a.catalogId === g.catalogId),
            )
            .map((g) => (
              <option value={g.id} key={g.id}>
                {g.title}
              </option>
            ))}
        </select>
      </label>
      {!demo && (
        <>
          <label>
            Buscar otra edición
            <input
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              maxLength={80}
            />
          </label>
          {search.pending && <p role="status">Buscando ediciones…</p>}
          {search.results.slice(0, 8).map((g) => (
            <button
              className="edition-result"
              type="button"
              key={g.catalogId}
              onClick={() => add(g.catalogId, g.title)}
            >
              Vincular {g.title}
            </button>
          ))}
          {search.error && <p role="alert">{search.error}</p>}
        </>
      )}
    </fieldset>
  );
}
