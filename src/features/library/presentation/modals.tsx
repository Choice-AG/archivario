"use client";
import dynamic from "next/dynamic";
import type { Activity, Library } from "../domain/model";
import { Modal, type ApiRequest, type Execute } from "./shared";
import { ShortcutList } from "./shortcuts";

// Las ventanas de la app. Cada una se descarga al abrirla por primera vez.
export function load<P>(loader: () => Promise<React.ComponentType<P>>) {
  return dynamic<P>(loader, {
    loading: () => <p className="loading-inline">Cargando…</p>,
  });
}
const DayActivity = load(() =>
  import("./day-activity").then((m) => m.DayActivity),
);
const BulkActivity = load(() =>
  import("./bulk-activity").then((m) => m.BulkActivity),
);
const BulkLink = load(() => import("./bulk-link").then((m) => m.BulkLink));
const Tonight = load(() => import("./tonight").then((m) => m.Tonight));
const PriorityEditor = load(() =>
  import("./priority-editor").then((m) => m.PriorityEditor),
);
const StopSession = load(() =>
  import("./stop-session").then((m) => m.StopSession),
);
const ImportGames = load(() =>
  import("./import-games").then((m) => m.ImportGames),
);
const AddGame = load(() => import("./add-game").then((m) => m.AddGame));

export type ModalState = {
  kind:
    | "add"
    | "activity"
    | "bulk"
    | "link"
    | "import"
    | "shortcuts"
    | "tonight"
    | "priority"
    | "stop";
  source?: "steam" | "csv";
  // Momento en que se paró la sesión.
  at?: number;
  id?: string;
  activity?: Activity;
  date?: string;
} | null;

// Accesos directos de la app instalada: /?accion=registrar, etc.
export function shortcutModal(): ModalState {
  if (typeof window === "undefined") return null;
  const action = new URLSearchParams(window.location.search).get("accion");
  return action === "registrar"
    ? { kind: "activity" }
    : action === "anadir"
      ? { kind: "add" }
      : action === "esta-noche"
        ? { kind: "tonight" }
        : null;
}

export function AppModals({
  modal,
  state,
  today,
  demo,
  execute,
  request,
  onClose,
  onGame,
}: {
  modal: NonNullable<ModalState>;
  state: Library;
  today: string;
  demo: boolean;
  execute: Execute;
  request: ApiRequest;
  onClose: () => void;
  onGame: (id: string) => void;
}) {
  switch (modal.kind) {
    case "add":
      return (
        <Modal
          title="Tu próxima aventura"
          description="Busca un juego o añade uno a tu manera."
          onClose={onClose}
        >
          <AddGame
            demo={demo}
            state={state}
            execute={execute}
            request={request}
            onClose={onClose}
            onOpen={onGame}
          />
        </Modal>
      );
    case "activity":
      return (
        <Modal
          title="Tu día de juego"
          description="Todos los juegos de este día, sus partidas y lo que quieras recordar."
          onClose={onClose}
        >
          <DayActivity
            state={state}
            initial={modal.activity}
            gameId={modal.id}
            date={modal.date ?? today}
            execute={execute}
            onGame={onGame}
          />
        </Modal>
      );
    case "bulk":
      return (
        <Modal
          title="Registrar varios días"
          description="Selecciona los días en que jugaste."
          onClose={onClose}
        >
          <BulkActivity
            state={state}
            today={today}
            execute={execute}
            onClose={onClose}
          />
        </Modal>
      );
    case "tonight":
      return (
        <Modal
          title="¿A qué juego esta noche?"
          description="Dime cuánto tiempo tienes y lo que te apetece, y te propongo tres juegos."
          onClose={onClose}
        >
          <Tonight
            state={state}
            today={today}
            execute={execute}
            onGame={onGame}
          />
        </Modal>
      );
    case "priority":
      return (
        <Modal
          title="Tu orden de prioridad"
          description="Ordena tus pendientes y próximos como quieras jugarlos."
          onClose={onClose}
        >
          <PriorityEditor state={state} execute={execute} onClose={onClose} />
        </Modal>
      );
    case "stop":
      return (
        <Modal
          title="Parar la sesión"
          description="Revisa el tiempo y apúntalo en tu diario."
          onClose={onClose}
        >
          <StopSession
            state={state}
            stoppedAt={modal.at ?? 0}
            execute={execute}
            onClose={onClose}
          />
        </Modal>
      );
    case "shortcuts":
      return (
        <Modal
          title="Atajos de teclado"
          description="Funcionan cuando no estás escribiendo en un campo."
          onClose={onClose}
        >
          <ShortcutList />
        </Modal>
      );
    case "import":
      return (
        <Modal
          title="Importar juegos"
          description="Los juegos que ya tienes no se duplican y entran como pendientes."
          onClose={onClose}
        >
          <ImportGames
            state={state}
            execute={execute}
            request={request}
            demo={demo}
            initialSource={modal.source}
          />
        </Modal>
      );
    case "link":
      return (
        <Modal
          title="Completar fichas con IGDB"
          description="Vincula los juegos añadidos a mano o importados con su ficha del catálogo."
          onClose={onClose}
        >
          <BulkLink
            state={state}
            request={request}
            execute={execute}
            onDone={onClose}
          />
        </Modal>
      );
  }
}
