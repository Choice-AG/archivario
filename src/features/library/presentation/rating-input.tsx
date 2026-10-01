"use client";
import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

const MIN = 1,
  MAX = 10,
  STEP = 0.5;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));
const label10 = (n: number) => n.toLocaleString("es") + " de 10";

function StarRow({ value, size }: { value: number; size: number }) {
  return Array.from({ length: MAX }, (_, i) => {
    const fill = Math.max(0, Math.min(1, value - i));
    return (
      <span key={i} className="rating-star" data-index={i}>
        <Star size={size} className="rating-star-empty" />
        <span className="rating-star-fill" style={{ width: fill * 100 + "%" }}>
          <Star size={size} fill="currentColor" />
        </span>
      </span>
    );
  });
}

// Nota en estrellas, solo para mostrar.
export function Stars({
  value,
  size = 12,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={"stars " + className}
      role="img"
      aria-label={"Tu nota: " + label10(value)}
    >
      <span className="stars-row" aria-hidden="true">
        <StarRow value={value} size={size} />
      </span>
      <span className="stars-number" aria-hidden="true">
        {value.toLocaleString("es")}
      </span>
    </span>
  );
}

// Diez estrellas con medias: la mitad izquierda de cada estrella da media
// nota. Con teclado funciona como un control deslizante (flechas, Inicio,
// Fin y Supr para quitar la nota). En un formulario el valor viaja en un
// campo oculto; con onChange se guarda poco después del último cambio.
export function RatingInput({
  name,
  label,
  defaultValue,
  value: controlled,
  onChange,
  size = 22,
}: {
  name?: string;
  label: string;
  defaultValue?: number;
  value?: number;
  onChange?: (value: number | undefined) => void;
  size?: number;
}) {
  const [value, setValue] = useState<number | undefined>(
      onChange ? controlled : defaultValue,
    ),
    [hover, setHover] = useState<number>(),
    [seen, setSeen] = useState(controlled);
  // Si la nota cambia desde fuera (deshacer, otra pestaña), se refleja.
  if (onChange && controlled !== seen) {
    setSeen(controlled);
    setValue(controlled);
  }
  const pending = useRef<{ value: number | undefined } | null>(null),
    timer = useRef<ReturnType<typeof setTimeout>>(undefined),
    latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current) latest.current?.(pending.current.value);
    pending.current = null;
  };
  useEffect(() => flush, []);
  const change = (next: number | undefined) => {
    setValue(next);
    if (!onChange) return;
    pending.current = { value: next };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };
  const shown = hover ?? value ?? 0;
  // Nota bajo el puntero: la estrella señalada y en qué mitad está.
  const pick = (e: React.MouseEvent) => {
    const star = (e.target as HTMLElement).closest<HTMLElement>(".rating-star");
    if (!star) return undefined;
    const r = star.getBoundingClientRect();
    return clamp(
      Number(star.dataset.index) + (e.clientX - r.left < r.width / 2 ? 0.5 : 1),
    );
  };
  return (
    <div className="rating-input">
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <div
        className="rating-stars"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value}
        aria-valuetext={value === undefined ? "Sin valorar" : label10(value)}
        onMouseLeave={() => setHover(undefined)}
        onBlur={flush}
        onMouseMove={(e) => setHover(pick(e))}
        onClick={(e) => {
          const next = pick(e);
          if (next !== undefined) change(next);
        }}
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
          change(next ?? undefined);
        }}
      >
        <span className="stars-row" aria-hidden="true">
          <StarRow value={shown} size={size} />
        </span>
      </div>
      <span className="rating-value" aria-hidden="true">
        {shown ? shown.toLocaleString("es") + "/10" : "Sin valorar"}
      </span>
      {value !== undefined && (
        <button
          type="button"
          className="text-link rating-clear"
          onClick={() => change(undefined)}
        >
          Quitar
        </button>
      )}
    </div>
  );
}
