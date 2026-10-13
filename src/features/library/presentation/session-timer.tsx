"use client";
import { useSyncExternalStore } from "react";
import { Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Game, Library } from "../domain/model";
import { clock } from "../domain/session";
import type { Execute } from "./shared";

// Un reloj compartido que avanza cada segundo mientras alguien lo mira.
let now = 0;
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  now = Date.now();
  ticker ??= setInterval(() => {
    now = Date.now();
    for (const l of listeners) l();
  }, 1000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && ticker) {
      clearInterval(ticker);
      ticker = undefined;
    }
  };
}
export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}

function Elapsed({ startedAt }: { startedAt: string }) {
  const current = useNow();
  return (
    <span className="session-clock" role="timer">
      {current ? clock((current - new Date(startedAt).getTime()) / 1000) : ""}
    </span>
  );
}

// Aviso flotante mientras hay una sesión en marcha, en cualquier página.
export function SessionBar({
  state,
  onStop,
  onGame,
}: {
  state: Library;
  onStop: () => void;
  onGame: (id: string) => void;
}) {
  const timer = state.profile.timer;
  const game = timer && state.games.find((g) => g.id === timer.gameId);
  if (!timer || !game) return null;
  return (
    <aside className="session-bar" aria-label="Sesión en marcha">
      <span className="session-dot" aria-hidden="true" />
      <button className="session-game" onClick={() => onGame(game.id)}>
        Jugando a <strong>{game.title}</strong>
      </button>
      <Elapsed startedAt={timer.startedAt} />
      <Button size="sm" onClick={onStop}>
        <Square size={13} fill="currentColor" /> Parar
      </Button>
    </aside>
  );
}

// «Empezar sesión» en la ficha y en lo que estás jugando.
export function SessionButton({
  game,
  state,
  execute,
  busy,
  onStop,
  compact = false,
}: {
  game: Game;
  state: Library;
  execute: Execute;
  busy?: boolean;
  onStop: () => void;
  compact?: boolean;
}) {
  const timer = state.profile.timer;
  if (game.wishlist) return null;
  if (timer?.gameId === game.id)
    return (
      <Button variant="secondary" onClick={onStop} className="session-running">
        <Square size={13} fill="currentColor" /> Parar sesión
        <Elapsed startedAt={timer.startedAt} />
      </Button>
    );
  // Solo una sesión a la vez: la otra se para desde la barra flotante.
  if (timer) return null;
  return (
    <Button
      variant="secondary"
      size={compact ? "icon" : "default"}
      disabled={busy}
      aria-label={"Empezar sesión de " + game.title}
      title="Empezar sesión"
      onClick={() =>
        execute({
          type: "timer",
          timer: {
            gameId: game.id,
            runId: game.primaryRunId,
            startedAt: new Date().toISOString(),
          },
        }).catch(() => {})
      }
    >
      <Timer size={16} />
      {!compact && " Empezar sesión"}
    </Button>
  );
}
