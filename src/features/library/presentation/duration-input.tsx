"use client";
import { DAY_MINUTES } from "../domain/model";

const presets = [
  [30, "30 min"],
  [60, "1 h"],
  [120, "2 h"],
  [180, "3 h"],
] as const;

// Tiempo jugado en horas y minutos, con atajos para lo habitual.
export function DurationInput({
  label,
  value,
  onChange,
  disabled,
  required = false,
}: {
  required?: boolean;
  label: string;
  value: number | undefined;
  onChange: (minutes: number | undefined) => void;
  disabled?: boolean;
}) {
  const hours = value ? Math.floor(value / 60) : undefined,
    rest = value ? value % 60 : undefined;
  const set = (h: number, m: number) => {
    const total = Math.min(DAY_MINUTES, Math.max(0, h * 60 + m));
    onChange(total > 0 ? total : undefined);
  };
  const number = (s: string) => {
    const n = Math.floor(Number(s));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return (
    <fieldset className="duration-input" disabled={disabled}>
      <legend>
        {label} {!required && <small>Opcional</small>}
      </legend>
      <div className="duration-fields">
        <label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            aria-label={label + " (horas)"}
            value={hours ?? ""}
            onChange={(e) => set(number(e.target.value), rest ?? 0)}
          />
          <span aria-hidden="true">h</span>
        </label>
        <label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            aria-label={label + " (minutos)"}
            value={rest ?? ""}
            onChange={(e) =>
              set(hours ?? 0, Math.min(59, number(e.target.value)))
            }
          />
          <span aria-hidden="true">min</span>
        </label>
        <span className="duration-presets choice-chips">
          {presets.map(([minutes, text]) => (
            <button
              type="button"
              key={minutes}
              aria-pressed={value === minutes}
              aria-label={label + ": " + text}
              onClick={() => onChange(value === minutes ? undefined : minutes)}
            >
              {text}
            </button>
          ))}
        </span>
      </div>
    </fieldset>
  );
}
