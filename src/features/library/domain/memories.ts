import { tagKey, type Activity, type Game, type Library } from "./model";
import { estimatedHours, type TimeMode } from "./daily";
import { daysBetween, releases } from "./releases";
import { timerMinutes } from "./session";

// «Tal día como hoy»: lo que jugabas este mismo día en años anteriores.
export function onThisDay(state: Library, today: string, max = 3) {
  const games = new Map(state.games.map((g) => [g.id, g]));
  const year = Number(today.slice(0, 4)),
    day = today.slice(4);
  return state.activities
    .filter(
      (a) => a.date.endsWith(day) && a.date < today && games.has(a.gameId),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.minutes ?? 0) - (a.minutes ?? 0) ||
        Number(!!b.note) - Number(!!a.note),
    )
    .slice(0, max)
    .map((activity) => ({
      activity,
      game: games.get(activity.gameId)!,
      years: year - Number(activity.date.slice(0, 4)),
    }));
}

// Busca en el diario por el texto de la nota o el título del juego.
export function searchJournal(
  items: Activity[],
  games: Map<string, Game>,
  query: string,
) {
  const needle = tagKey(query);
  if (!needle) return items;
  return items.filter(
    (a) =>
      tagKey(a.note).includes(needle) ||
      tagKey(games.get(a.gameId)?.title ?? "").includes(needle),
  );
}

// Agrupa actividades (ya ordenadas por fecha) por día, conservando el orden.
export function groupByDay(items: Activity[]) {
  const groups: { date: string; items: Activity[] }[] = [];
  for (const a of items) {
    const last = groups[groups.length - 1];
    if (last?.date === a.date) last.items.push(a);
    else groups.push({ date: a.date, items: [a] });
  }
  return groups;
}

// Cuánto suma lo que tienes pendiente (sin lista de deseos). Solo informa.
export function backlogHours(state: Library, mode: TimeMode = "main") {
  const runs = new Map(state.runs.map((r) => [r.id, r]));
  const pending = state.games.filter(
    (g) => !g.wishlist && runs.get(g.primaryRunId)?.status === "pendiente",
  );
  const known = pending.flatMap((g) => {
    const hours = estimatedHours(g, mode);
    return hours === undefined ? [] : [hours];
  });
  return {
    games: pending.length,
    hours: Math.round(known.reduce((s, h) => s + h, 0)),
    unknown: pending.length - known.length,
  };
}

export type Notice = {
  id: string;
  kind: "release" | "session";
  gameId: string;
  text: string;
};

// Avisos del día: lo que sale hoy o esta semana y una sesión olvidada.
export function dayNotices(state: Library, today: string, now: number) {
  const out: Notice[] = [];
  const timer = state.profile.timer;
  const playing = timer && state.games.find((g) => g.id === timer.gameId);
  if (timer && playing && timerMinutes(timer, now) > 12 * 60)
    out.push({
      id: "session-" + timer.startedAt,
      kind: "session",
      gameId: playing.id,
      text:
        "Tu sesión de " +
        playing.title +
        " lleva más de 12 horas en marcha. ¿Se te olvidó pararla?",
    });
  const { upcoming, recent } = releases(state, today, 0);
  for (const g of recent)
    out.push({
      id: "release-" + g.id + "-" + g.releaseDate,
      kind: "release",
      gameId: g.id,
      text: "Hoy sale " + g.title + ".",
    });
  for (const g of upcoming) {
    const days = daysBetween(today, g.releaseDate!);
    if (days <= 7)
      out.push({
        id: "release-" + g.id + "-" + g.releaseDate,
        kind: "release",
        gameId: g.id,
        text:
          g.title +
          (days === 1 ? " sale mañana." : " sale en " + days + " días."),
      });
  }
  return out;
}

// Todos tus momentos guardados, del más reciente al más antiguo.
export function allMoments(state: Library) {
  return state.games
    .flatMap((game) => (game.moments ?? []).map((moment) => ({ game, moment })))
    .sort((a, b) => (b.moment.date ?? "").localeCompare(a.moment.date ?? ""));
}
