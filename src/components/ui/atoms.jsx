import React, { useState, useEffect } from "react";
import { X, Star, Trash2, AlertTriangle, FolderKanban } from "lucide-react";
import { TYPE_CONFIG, statusMeta, priorityMeta } from "../../lib/model";

/* ============================================================
   UI ATOMS
   ============================================================ */

export function Btn({ children, variant = "ghost", className = "", ...props }) {
  const base = "mt-btn";
  const variants = { primary: "mt-btn-primary", ghost: "mt-btn-ghost", danger: "mt-btn-danger", subtle: "mt-btn-subtle" };
  return (
    <button className={`${base} ${variants[variant] || ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="mt-label">{label}</span>
      {children}
      {hint && <span className="text-xs mt-ink-soft">{hint}</span>}
    </label>
  );
}

export function TInput(props) {
  return <input {...props} className={`mt-input ${props.className || ""}`} />;
}
export function TSelect({ children, ...props }) {
  return (
    <select {...props} className={`mt-input ${props.className || ""}`}>
      {children}
    </select>
  );
}
export function TTextArea(props) {
  return <textarea {...props} className={`mt-input ${props.className || ""}`} />;
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="mt-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`mt-modal ${wide ? "mt-modal-wide" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold mt-display">{title}</h3>
          <button onClick={onClose} className="mt-icon-btn" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto pr-1 -mr-1">{children}</div>
      </div>
    </div>
  );
}

export function StampBadge({ item }) {
  const meta = statusMeta(item);
  if (meta.tone !== "done" && meta.tone !== "mastered") return null;
  return (
    <div className={`mt-stamp mt-stamp-${meta.tone === "mastered" ? "gold" : "red"}`}>
      {meta.tone === "mastered" ? "Platinado" : "Hecho"}
    </div>
  );
}

export function StatusPill({ item }) {
  const meta = statusMeta(item);
  return <span className={`mt-pill mt-pill-${meta.tone}`}>{meta.l}</span>;
}

export function PriorityPill({ item }) {
  const meta = priorityMeta(item);
  return <span className={`mt-priority-pill mt-priority-${meta.v}`}>{meta.l}</span>;
}

export function ScoreTag({ score }) {
  if (score === null || score === undefined || score === "") return <span className="mt-ink-soft text-xs">Sin nota</span>;
  return (
    <span className="mt-score">
      <Star size={12} className="mt-score-star" /> {Number(score).toFixed(1)}
    </span>
  );
}

export function TypeIcon({ type, size = 14 }) {
  const Icon = TYPE_CONFIG[type].icon;
  return <Icon size={size} />;
}

export function CoverThumb({ item, size = "card" }) {
  const cls = size === "card" ? "mt-cover" : "mt-cover-sm";
  if (item.cover) {
    return <img src={item.cover} alt={item.title} className={cls} loading="lazy" />;
  }
  return (
    <div className={`${cls} mt-cover-fallback`}>
      <TypeIcon type={item.type} size={size === "card" ? 26 : 16} />
      <span>{item.title.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

export function ConfirmInline({ label, onConfirm }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed) {
    return (
      <Btn variant="danger" onClick={() => setArmed(true)} title={label}>
        <Trash2 size={14} />
      </Btn>
    );
  }
  return (
    <Btn variant="danger" onClick={onConfirm} className="mt-confirm-armed">
      <AlertTriangle size={14} /> Confirmar
    </Btn>
  );
}

export function EmptyState({ text, action }) {
  return (
    <div className="mt-empty">
      <FolderKanban size={26} className="mt-ink-soft" />
      <p>{text}</p>
      {action}
    </div>
  );
}
