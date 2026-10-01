"use client";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import type { Library } from "../domain/model";
import type { ApiRequest, Execute } from "./shared";
import { SettingsPanel } from "./settings-panel";

// Los ajustes tienen su propia página: se llega desde el perfil y no ocupan
// sitio en él.
export function SettingsPage({
  state,
  execute,
  request,
  demo,
  onBack,
  onLibrary,
}: {
  state: Library;
  execute: Execute;
  request: ApiRequest;
  demo: boolean;
  onBack: () => void;
  onLibrary: () => void;
}) {
  // La página se carga bajo demanda: el foco se mueve al montarla.
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  return (
    <div className="settings-page">
      <button className="game-back" onClick={onBack}>
        <ArrowLeft size={16} /> Volver al perfil
      </button>
      <header className="settings-head">
        <p className="eyebrow">TU ESPACIO</p>
        <h1 tabIndex={-1} ref={title}>
          Ajustes
        </h1>
        <p className="muted">Tu perfil y tus notas son privados.</p>
      </header>
      <div>
        <SettingsPanel
          state={state}
          execute={execute}
          request={request}
          demo={demo}
          onClose={onLibrary}
        />
      </div>
    </div>
  );
}
