"use client";
import { FileSpreadsheet, Layers3, Search, Store } from "lucide-react";

// Primer uso: tres caminos para llenar la biblioteca de una vez.
export function Welcome({
  demo,
  onImport,
  onAdd,
  onSagas,
}: {
  demo: boolean;
  onImport: (source: "steam" | "csv") => void;
  onAdd: () => void;
  onSagas: () => void;
}) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <h2 id="welcome-title">Empieza tu biblioteca</h2>
      <p className="muted">
        Trae los juegos que ya tienes y luego apunta a qué juegas, a tu ritmo.
      </p>
      <div className="welcome-options">
        <button onClick={() => onImport("steam")} disabled={demo}>
          <Store size={22} aria-hidden="true" />
          <strong>Importar desde Steam</strong>
          <span>
            {demo
              ? "Disponible al iniciar sesión."
              : "Con tu perfil público, en un minuto."}
          </span>
        </button>
        <button onClick={() => onImport("csv")}>
          <FileSpreadsheet size={22} aria-hidden="true" />
          <strong>Subir un CSV</strong>
          <span>Desde una hoja de cálculo o de otra app.</span>
        </button>
        <button onClick={onAdd}>
          <Search size={22} aria-hidden="true" />
          <strong>Buscar en el catálogo</strong>
          <span>Añade tus juegos uno a uno con su ficha.</span>
        </button>
      </div>
      <button className="text-link welcome-sagas" onClick={onSagas}>
        <Layers3 size={15} aria-hidden="true" /> O explora las guías de sagas
      </button>
    </section>
  );
}
