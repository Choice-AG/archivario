import { plural } from "./format";

export type Critic = { score: number; count: number };

// Tramos como los de los agregadores de crítica: 75+ favorable, 50-74 mixta.
export const criticTone = (score: number) =>
  score >= 75 ? "good" : score >= 50 ? "mixed" : "bad";

export function CriticScore({
  critic,
  compact = false,
}: {
  critic?: Critic;
  compact?: boolean;
}) {
  if (!critic) return null;
  const label = `Nota de la crítica: ${critic.score} sobre 100, ${plural(
    critic.count,
    "reseña",
    "reseñas",
  )} (IGDB)`;
  return compact ? (
    <span
      className={"critic-badge critic-" + criticTone(critic.score)}
      title={label}
      aria-label={label}
    >
      {critic.score}
    </span>
  ) : (
    <div className="critic-score" aria-label={label}>
      <span className={"critic-badge critic-" + criticTone(critic.score)}>
        {critic.score}
      </span>
      <span>
        <strong>Crítica</strong>
        <small>{plural(critic.count, "reseña", "reseñas")} · IGDB</small>
      </span>
    </div>
  );
}
