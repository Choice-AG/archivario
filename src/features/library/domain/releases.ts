import type { Game, Library } from "./model";

const DAY = 86400000;
const time = (date: string) => new Date(date + "T12:00:00Z").getTime();
export const daysBetween = (from: string, to: string) =>
  Math.round((time(to) - time(from)) / DAY);

// Juegos que quieres o tienes pendientes, vinculados con IGDB.
function waiting(state: Library, game: Game) {
  const run = state.runs.find((r) => r.id === game.primaryRunId);
  return (
    !!game.catalogId &&
    (!!game.wishlist || run?.status === "pendiente" || game.next)
  );
}

// Lo que aún no ha salido, por fecha, y lo que salió hace poco.
export function releases(state: Library, today: string, recentDays = 14) {
  const dated = state.games
    .filter((g) => g.releaseDate && waiting(state, g))
    .sort(
      (a, b) =>
        a.releaseDate!.localeCompare(b.releaseDate!) ||
        a.title.localeCompare(b.title, "es"),
    );
  return {
    upcoming: dated.filter((g) => g.releaseDate! > today),
    recent: dated.filter(
      (g) =>
        g.releaseDate! <= today &&
        daysBetween(g.releaseDate!, today) <= recentDays,
    ),
  };
}

// Juegos cuya fecha conviene consultar en IGDB: sin fecha o aún sin salir
// (las fechas se retrasan). Los de la lista de deseos van primero.
export function releaseCandidates(state: Library, today: string, max = 50) {
  return state.games
    .filter(
      (g) => waiting(state, g) && (!g.releaseDate || g.releaseDate >= today),
    )
    .sort((a, b) => Number(!!b.wishlist) - Number(!!a.wishlist))
    .slice(0, max);
}

export function releaseLabel(date: string, today: string) {
  const days = daysBetween(today, date);
  if (days === 0) return "Sale hoy";
  if (days === 1) return "Sale mañana";
  if (days > 1) return "Faltan " + days + " días";
  if (days === -1) return "Salió ayer";
  return "Salió hace " + -days + " días";
}

// Lo que esperas y sale en un mes concreto ("2026-11"), para el calendario.
export function releasesIn(state: Library, month: string) {
  return state.games.filter(
    (g) => g.releaseDate?.startsWith(month) && waiting(state, g),
  );
}
