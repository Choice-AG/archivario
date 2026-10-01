"use client";
import { useState } from "react";
import { Star } from "lucide-react";

const MIN = 1,
  MAX = 10,
  STEP = 0.5;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

// Diez estrellas con medias: la mitad izquierda de cada estrella da media
// nota. Con teclado funciona como un control deslizante (flechas, Inicio,
// Fin y Supr para quitar la nota). El valor viaja en un campo oculto para
// que los formularios lo lean como antes.
export function RatingInput({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState<number | undefined>(defaultValue),
    [hover, setHover] = useState<number>();
  const shown = hover ?? value ?? 0;
  const text =
    value === undefined ? "Sin valorar" : value.toLocaleString("es") + " de 10";
  return (
    <div className="rating-input">
      <input type="hidden" name={name} value={value ?? ""} />
      <div
        className="rating-stars"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value}
        aria-valuetext={text}
        onMouseLeave={() => setHover(undefined)}
        onKeyDown={(e) => {
          const next =
            e.key === "ArrowRight" || e.key === "ArrowUp"
              ? clamp((value ?? MIN - STEP) + STEP)
              : e.key === "ArrowLeft" || e.key === "ArrowDown"
                ? value === undefined
                  ? undefined
                  : clamp(value - STEP)
                : e.key === "Home"
                  ? MIN
                  : e.key === "End"
                    ? MAX
                    : e.key === "Delete" || e.key === "Backspace"
                      ? null
                      : undefined;
          if (next === undefined) return;
          e.preventDefault();
          setValue(next ?? undefined);
        }}
      >
        {Array.from({ length: MAX }, (_, i) => {
          const fill = Math.max(0, Math.min(1, shown - i));
          return (
            <span
              key={i}
              className="rating-star"
              aria-hidden="true"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setHover(
                  clamp(i + (e.clientX - r.left < r.width / 2 ? 0.5 : 1)),
                );
              }}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setValue(
                  clamp(i + (e.clientX - r.left < r.width / 2 ? 0.5 : 1)),
                );
              }}
            >
              <Star size={22} className="rating-star-empty" />
              <span
                className="rating-star-fill"
                style={{ width: fill * 100 + "%" }}
              >
                <Star size={22} fill="currentColor" />
              </span>
            </span>
          );
        })}
      </div>
      <span className="rating-value" aria-hidden="true">
        {shown ? shown.toLocaleString("es") + "/10" : "Sin valorar"}
      </span>
      {value !== undefined && (
        <button
          type="button"
          className="text-link rating-clear"
          onClick={() => setValue(undefined)}
        >
          Quitar
        </button>
      )}
    </div>
  );
}
