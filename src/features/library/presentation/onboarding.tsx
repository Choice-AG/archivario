"use client";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Library } from "../domain/model";
import { onboardingSteps } from "../domain/profile";
import type { Execute } from "./shared";

// Solo para bibliotecas que empiezan: con muchos juegos ya no hace falta.
export function showOnboarding(state: Library) {
  return (
    !state.profile.onboardingDone &&
    state.games.length < 10 &&
    onboardingSteps(state).some((s) => !s.done)
  );
}

// Primeros pasos para cuentas nuevas. Desaparece al completarlos o al cerrarla.
export function Onboarding({
  state,
  execute,
  onAdd,
  onDay,
  onGame,
}: {
  state: Library;
  execute: Execute;
  onAdd: () => void;
  onDay: () => void;
  onGame: (id: string) => void;
}) {
  const steps = onboardingSteps(state);
  const done = steps.filter((s) => s.done).length;
  const first = state.games[0];
  const action = (id: (typeof steps)[number]["id"]) =>
    id === "game"
      ? { label: "Añadir juego", run: onAdd }
      : id === "day"
        ? { label: "Registrar hoy", run: onDay }
        : first
          ? { label: "Abrir " + first.title, run: () => onGame(first.id) }
          : undefined;
  const close = () =>
    execute({
      type: "profile",
      profile: { ...state.profile, onboardingDone: true },
    }).catch(() => {});
  return (
    <section className="onboarding" aria-labelledby="onboarding-title">
      <div className="onboarding-head">
        <div>
          <h2 id="onboarding-title">Tus primeros pasos</h2>
          <p className="muted text-sm">
            Cuatro cosas para sacarle partido a Archivario, a tu ritmo.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ocultar los primeros pasos"
          onClick={close}
        >
          <X size={18} />
        </Button>
      </div>
      <progress
        className="onboarding-progress"
        max={steps.length}
        value={done}
        aria-label={done + " de " + steps.length + " pasos hechos"}
      />
      <ol className="onboarding-steps">
        {steps.map((s) => {
          const a = !s.done ? action(s.id) : undefined;
          return (
            <li key={s.id} className={s.done ? "done" : ""}>
              <span className="onboarding-check" aria-hidden="true">
                {s.done && <Check size={13} />}
              </span>
              <span>
                {s.label}
                <span className="sr-only">
                  {s.done ? " (hecho)" : " (pendiente)"}
                </span>
              </span>
              {a && (
                <button className="text-link" onClick={a.run}>
                  {a.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
