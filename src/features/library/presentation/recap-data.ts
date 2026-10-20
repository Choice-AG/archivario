import type { Library } from "../domain/model";
import { periodSummary } from "../domain/recap";
import { compactTime } from "../domain/session";
import { monthLabel, plural } from "./format";
import type { RecapData } from "./recap-image";

const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const rating = (n: number) =>
  n.toLocaleString("es", { maximumFractionDigits: 1 }) + "/10";

// Los datos de la imagen de un año («2026») o de un mes («2026-10»).
export function recapData(state: Library, period: string): RecapData {
  const year = period.length === 4;
  const s = periodSummary(state, period);
  const stats: [string, string][] = [
    [String(s.games), s.games === 1 ? "juego jugado" : "juegos jugados"],
    [String(s.days), s.days === 1 ? "día de juego" : "días de juego"],
    [String(s.completed), s.completed === 1 ? "completado" : "completados"],
  ];
  if (s.minutes) stats.push([compactTime(s.minutes), "jugadas en total"]);
  const lines: string[] = [];
  if (s.best)
    lines.push("Mi favorito: " + s.best.title + " · " + rating(s.best.rating!));
  if (year) {
    const days = Array<number>(12).fill(0);
    for (const d of new Set(
      state.activities
        .filter((a) => a.date.startsWith(period + "-"))
        .map((a) => a.date),
    ))
      days[Number(d.slice(5, 7)) - 1]++;
    const busiest = days.indexOf(Math.max(...days));
    if (days[busiest]) lines.push("Mi mes con más juego: " + months[busiest]);
  }
  if (s.completedGames.length)
    lines.push(
      "Terminé: " +
        s.completedGames
          .slice(0, 3)
          .map((g) => g.title)
          .join(", ") +
        (s.completedGames.length > 3 ? " y más" : ""),
    );
  return {
    eyebrow: "Archivario",
    title: year ? "Mi " + period : monthLabel(period),
    subtitle:
      (state.profile.name ? state.profile.name + " · " : "") +
      (year ? "Un año de juego" : "Un mes de juego"),
    stats,
    heading: "Lo que más jugué",
    games: s.top.slice(0, 5).map((g) => ({
      title: g.title,
      cover: g.cover,
      detail: s.minutesOf(g)
        ? compactTime(s.minutesOf(g))
        : plural(s.daysOf(g), "día", "días"),
    })),
    lines,
  };
}
