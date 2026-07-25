import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toCSV, download } from "../lib/exportData";
import { Btn } from "../components/ui/atoms";

/* ============================================================
   SETTINGS / EXPORT-IMPORT
   ============================================================ */

export function SettingsView({ items, sagas, onImport }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.items)) throw new Error("Formato inválido");
        onImport(data);
        setMsg(`Importados ${data.items.length} elementos y ${(data.sagas || []).length} sagas.`);
      } catch (err) {
        setMsg("No se pudo leer el archivo. Asegúrate de que sea un JSON exportado desde aquí.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="mt-page-title">Ajustes y backup</h1>
        <p className="mt-ink-soft text-sm">Tus datos se guardan automáticamente. Exporta una copia cuando quieras.</p>
      </div>

      <div className="mt-card p-4 flex flex-col gap-3">
        <h2 className="font-semibold mt-display-sm">Exportar</h2>
        <p className="text-xs mt-ink-soft">{items.length} elementos · {sagas.length} sagas</p>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="subtle" onClick={() => download("archivario-backup.json", JSON.stringify({ items, sagas }, null, 2), "application/json")}>
            <Download size={14} /> Exportar JSON
          </Btn>
          <Btn variant="subtle" onClick={() => download("archivario-items.csv", toCSV(items), "text/csv")}>
            <Download size={14} /> Exportar CSV
          </Btn>
        </div>
      </div>

      <div className="mt-card p-4 flex flex-col gap-3">
        <h2 className="font-semibold mt-display-sm">Importar</h2>
        <p className="text-xs mt-ink-soft">Sube un JSON exportado desde Archivario. Se combinará con tus datos actuales.</p>
        <input ref={fileRef} type="file" accept="application/json" onChange={handleFile} className="hidden" />
        <div>
          <Btn variant="subtle" onClick={() => fileRef.current.click()}><Upload size={14} /> Elegir archivo</Btn>
        </div>
        {msg && <p className="text-xs mt-accent-text">{msg}</p>}
      </div>
    </div>
  );
}
