"use client";
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import type { Library } from "../domain/model";
import { dayNotices } from "../domain/memories";

// Avisos del día: se calculan al abrir la app, sin servidor. Lo que cierras
// no vuelve a salir en este navegador.
const DISMISSED_KEY = "archivario-avisos-vistos";
export const NOTIFY_KEY = "archivario-avisos-sistema";

function read(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}
function remember(key: string, ids: string[]) {
  try {
    // Solo los últimos: los avisos antiguos ya no vuelven a calcularse.
    localStorage.setItem(key, JSON.stringify(ids.slice(-60)));
  } catch {
    // Sin almacenamiento, el aviso vuelve a salir la próxima vez.
  }
}

export function systemNoticesOn() {
  try {
    return (
      localStorage.getItem(NOTIFY_KEY) === "1" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    );
  } catch {
    return false;
  }
}

export function DayNotices({
  state,
  today,
  onGame,
  onStop,
}: {
  state: Library;
  today: string;
  onGame: (id: string) => void;
  onStop: () => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : read(DISMISSED_KEY),
  );
  // La hora se fija al abrir: basta para detectar una sesión olvidada.
  const [now] = useState(() => Date.now());
  const notices = dayNotices(state, today, now).filter(
    (n) => !dismissed.includes(n.id),
  );
  const key = notices.map((n) => n.id).join();
  // Si lo has activado en ajustes, también como notificación del sistema,
  // una sola vez por aviso.
  useEffect(() => {
    if (!key || !systemNoticesOn()) return;
    const sent = read(NOTIFY_KEY + "-enviados");
    const fresh = notices.filter((n) => !sent.includes(n.id));
    for (const n of fresh)
      try {
        new Notification("Archivario", { body: n.text, tag: n.id });
      } catch {
        // Algunos navegadores solo dejan notificar desde el service worker.
      }
    if (fresh.length)
      remember(NOTIFY_KEY + "-enviados", [...sent, ...fresh.map((n) => n.id)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!notices.length) return null;
  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    remember(DISMISSED_KEY, next);
  };
  return (
    <ul className="day-notices" aria-label="Avisos de hoy">
      {notices.slice(0, 3).map((n) => (
        <li key={n.id}>
          <Bell size={15} aria-hidden="true" />
          <span>{n.text}</span>
          <button
            className="text-link"
            onClick={() => (n.kind === "session" ? onStop() : onGame(n.gameId))}
          >
            {n.kind === "session" ? "Parar y apuntar" : "Ver el juego"}
          </button>
          <button
            className="notice-close"
            aria-label={"Cerrar el aviso: " + n.text}
            onClick={() => dismiss(n.id)}
          >
            <X size={15} />
          </button>
        </li>
      ))}
    </ul>
  );
}

// Ajuste de este dispositivo: enviar los avisos del día también como
// notificación del sistema al abrir Archivario.
export function NoticeToggle() {
  const [on, setOn] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    // Se lee tras montar: el servidor no conoce los permisos del navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(systemNoticesOn());
  }, []);
  const supported = typeof Notification !== "undefined";
  return (
    <>
      <label className="checkbox-label mt-3">
        <input
          type="checkbox"
          checked={on}
          disabled={!supported}
          onChange={async (e) => {
            setMessage("");
            try {
              if (!e.target.checked) {
                localStorage.removeItem(NOTIFY_KEY);
                setOn(false);
                return;
              }
              const permission = await Notification.requestPermission();
              if (permission !== "granted") {
                setMessage(
                  "El navegador no ha dado permiso para las notificaciones.",
                );
                return;
              }
              localStorage.setItem(NOTIFY_KEY, "1");
              setOn(true);
            } catch {
              setMessage("No se ha podido cambiar este ajuste.");
            }
          }}
        />{" "}
        Avisarme en este dispositivo de lanzamientos y sesiones olvidadas
      </label>
      <p className="muted text-xs">
        Los avisos se comprueban al abrir Archivario y siempre se muestran
        dentro de la app.
        {!supported && " Este navegador no admite notificaciones."}
      </p>
      {message && (
        <p role="alert" className="form-error">
          {message}
        </p>
      )}
    </>
  );
}
