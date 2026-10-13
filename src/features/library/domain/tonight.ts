import { estimatedHours } from "./daily";
import { daysBetween } from "./releases";
import { playedTime } from "./session";
import type { Game, Library, Run } from "./model";

// «¿A qué juego esta noche?»: con el tiempo que tienes, dónde vas a jugar y
// lo que te apetece, ordena tus juegos y explica por qué propone cada uno.

export type TonightTime = "rato" | "tarde" | "noche";
export type TonightMood = "seguir" | "nuevo" | "igual";
export const tonightTimes: [TonightTime, string][] = [
  ["rato", "Un rato (1 h o menos)"],
  ["tarde", "Una tarde (2-3 h)"],
  ["noche", "Sin prisa"],
];
export const tonightMoods: [TonightMood, string][] = [
  ["seguir", "Seguir con algo"],
  ["nuevo", "Empezar algo nuevo"],
  ["igual", "Me da igual"],
];

export type Suggestion = { game: Game; run: Run; reasons: string[] };

const ago = (days: number) =>
  days <= 0
    ? "hoy"
    : days === 1
      ? "ayer"
      : days < 14
        ? "hace " + days + " días"
        : days < 60
          ? "hace " + Math.round(days / 7) + " semanas"
          : "hace " + Math.round(days / 30) + " meses";
const hoursText = (h: number) =>
  h.toLocaleString("es", { maximumFractionDigits: 0 }) + " h";
const short = (text: string, max = 70) =>
  text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;

export function suggestTonight(
  state: Library,
  input: { time: TonightTime; platform: string; mood: TonightMood },
  today: string,
): Suggestion[] {
  const lastDay = new Map<string, string>();
  for (const a of state.activities)
    if ((lastDay.get(a.gameId) ?? "") < a.date) lastDay.set(a.gameId, a.date);
  const priority = (state.profile.priority ?? []).filter((id) => {
    const g = state.games.find((x) => x.id === id);
    const r = g && state.runs.find((x) => x.id === g.primaryRunId);
    return r?.status === "pendiente";
  });
  const scored = state.games.flatMap((game) => {
    const run = state.runs.find((r) => r.id === game.primaryRunId);
    if (!run || game.wishlist) return [];
    if (game.releaseDate && game.releaseDate > today) return [];
    const started = run.status === "jugando" || run.status === "en pausa";
    if (!started && run.status !== "pendiente") return [];
    if (input.mood === "seguir" && !started) return [];
    if (input.mood === "nuevo" && started) return [];
    if (
      input.platform &&
      run.platform !== input.platform &&
      !game.platforms.includes(input.platform)
    )
      return [];
    const reasons: [number, string][] = [];
    let score = 0;
    const last = lastDay.get(game.id);
    const since = last ? daysBetween(last, today) : undefined;
    const estimate = estimatedHours(game, "main");
    const played = playedTime(state, game.id, run.id).minutes / 60;
    const left =
      started && estimate !== undefined && played > 0
        ? estimate - played
        : undefined;
    if (run.status === "jugando") {
      score += 50;
      if (since !== undefined && since <= 7) {
        score += 15;
        reasons.push([6, "Lo jugaste " + ago(since)]);
      } else if (since !== undefined)
        reasons.push([5, "Lo jugaste por última vez " + ago(since)]);
      else reasons.push([2, "Lo estás jugando"]);
    } else if (run.status === "en pausa") {
      score += 30;
      reasons.push([
        5,
        "Lo dejaste en pausa" + (since !== undefined ? " " + ago(since) : ""),
      ]);
    } else {
      score += 20;
      const place = priority.indexOf(game.id);
      if (place >= 0) {
        score += Math.max(0, 30 - place * 4);
        if (place < 5)
          reasons.push([7, "Es el n.º " + (place + 1) + " de tu prioridad"]);
      }
      if (game.next) {
        score += 10;
        reasons.push([6, "Lo marcaste como próximo"]);
      }
      if (game.notesBefore?.trim())
        reasons.push([3, "Tienes una nota para antes de empezar"]);
    }
    if (started && run.whereLeft.trim())
      reasons.push([4, "Lo dejaste en: «" + short(run.whereLeft.trim()) + "»"]);
    if (left !== undefined && left > 0)
      reasons.push([5, "Le quedan unas " + hoursText(Math.max(1, left))]);
    const finishable =
      left !== undefined &&
      left > 0 &&
      left <= (input.time === "rato" ? 1.5 : input.time === "tarde" ? 3 : 5);
    if (finishable) {
      score += 20;
      reasons.push([8, "Puedes terminarlo esta noche"]);
    }
    if (input.time === "rato") {
      if (started) score += 10;
      else if (estimate !== undefined && estimate <= 6) {
        score += 10;
        reasons.push([
          4,
          "Es corto: unas " + hoursText(estimate) + " en total",
        ]);
      } else if (estimate !== undefined && estimate > 40) score -= 10;
    } else if (input.time === "tarde") {
      if (!started && estimate !== undefined && estimate <= 12) {
        score += 5;
        reasons.push([3, "Se termina en pocas tardes"]);
      }
    } else if (!started) {
      score += 10;
      if (estimate !== undefined && estimate >= 20)
        reasons.push([3, "Una buena noche para empezar algo grande"]);
    }
    if (game.critic && game.critic.score >= 85) {
      score += 5;
      reasons.push([2, "La crítica le da un " + game.critic.score]);
    }
    if (!reasons.length) reasons.push([1, "Lo tienes pendiente"]);
    return [
      {
        game,
        run,
        score,
        reasons: reasons
          .sort((a, b) => b[0] - a[0])
          .slice(0, 3)
          .map(([, text]) => text),
      },
    ];
  });
  return scored
    .sort(
      (a, b) =>
        b.score - a.score || a.game.title.localeCompare(b.game.title, "es"),
    )
    .map(({ game, run, reasons }) => ({ game, run, reasons }));
}
