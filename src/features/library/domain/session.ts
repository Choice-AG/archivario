import {
  DAY_MINUTES,
  dateInZone,
  type Activity,
  type Library,
  type SessionTimer,
} from "./model";

// Tiempo jugado: lo que apuntas cada día en el diario, a mano o con el
// cronómetro. Solo suma; no hay metas ni porcentajes.

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60),
    m = total % 60;
  if (!h) return m + " min";
  return m ? h + " h " + m + " min" : h + " h";
}

export function sumMinutes(activities: Activity[]) {
  return activities.reduce((sum, a) => sum + (a.minutes ?? 0), 0);
}

// Tiempo y sesiones registradas de un juego (o de una de sus partidas).
export function playedTime(state: Library, gameId: string, runId?: string) {
  const timed = state.activities.filter(
    (a) => a.gameId === gameId && a.minutes && (!runId || a.runId === runId),
  );
  return { minutes: sumMinutes(timed), sessions: timed.length };
}

// Tiempo apuntado en un periodo: "2026", "2026-03" o "2026-03-14".
export function minutesIn(state: Library, prefix: string) {
  const ids = new Set(state.games.map((g) => g.id));
  return sumMinutes(
    state.activities.filter(
      (a) => ids.has(a.gameId) && a.date.startsWith(prefix),
    ),
  );
}

// Minutos que lleva el cronómetro.
export function timerMinutes(timer: SessionTimer, now: number) {
  return Math.max(
    0,
    Math.floor((now - new Date(timer.startedAt).getTime()) / 60000),
  );
}

// Lo que se propone apuntar al parar: entre 1 minuto y un día entero. Si
// se quedó en marcha más de un día, lo dice para que lo revises.
export function sessionToLog(timer: SessionTimer, now: number, zone: string) {
  const elapsed = timerMinutes(timer, now);
  return {
    date: dateInZone(new Date(timer.startedAt), zone),
    minutes: Math.min(DAY_MINUTES, Math.max(1, elapsed)),
    forgotten: elapsed > 12 * 60,
  };
}

// Reloj de la sesión: 0:42:10.
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    r = s % 60;
  return (
    h + ":" + String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0")
  );
}
