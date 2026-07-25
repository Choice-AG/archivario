import React, { useMemo } from "react";
import { Clock, Trophy, Star, Library, ChevronRight } from "lucide-react";
import { TYPE_LIST, TYPE_CONFIG, isDone } from "../lib/model";
import { EmptyState } from "../components/ui/atoms";
import { ItemRow } from "../components/ItemCard";

/* ============================================================
   DASHBOARD
   ============================================================ */

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="mt-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="mt-label">{label}</span>
        <Icon size={16} className="mt-ink-soft" />
      </div>
      <div className="mt-stat-value mt-display">{value}</div>
      {sub && <div className="text-xs mt-ink-soft">{sub}</div>}
    </div>
  );
}

export function Dashboard({ items, sagas, onOpenItem, goTo }) {
  const thisYear = new Date().getFullYear();

  const totalHours = useMemo(
    () => items.filter((i) => i.type === "game").reduce((a, i) => a + (Number(i.hours) || 0), 0),
    [items]
  );
  const completedThisYear = useMemo(
    () => items.filter((i) => isDone(i) && i.endDate && new Date(i.endDate).getFullYear() === thisYear).length,
    [items]
  );
  const scored = useMemo(() => items.filter((i) => i.score !== "" && i.score !== null && i.score !== undefined), [items]);
  const avgScore = scored.length ? (scored.reduce((a, i) => a + Number(i.score), 0) / scored.length).toFixed(1) : "—";

  const byType = useMemo(() => {
    const m = {};
    TYPE_LIST.forEach((t) => (m[t] = { total: 0, done: 0 }));
    items.forEach((i) => {
      m[i.type].total++;
      if (isDone(i)) m[i.type].done++;
    });
    return m;
  }, [items]);

  const recent = useMemo(
    () => [...items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [items]
  );

  const sagaMap = Object.fromEntries(sagas.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mt-page-title">Panel general</h1>
        <p className="mt-ink-soft text-sm">Tu colección de un vistazo.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Horas jugadas" value={totalHours.toLocaleString("es-ES")} sub="Total en videojuegos" />
        <StatCard icon={Trophy} label={`Completados ${thisYear}`} value={completedThisYear} sub="Este año, todos los tipos" />
        <StatCard icon={Star} label="Nota media" value={avgScore} sub={`${scored.length} elementos puntuados`} />
        <StatCard icon={Library} label="Colección total" value={items.length} sub={`${sagas.length} sagas`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {TYPE_LIST.map((t) => {
          const cfg = TYPE_CONFIG[t];
          const Icon = cfg.icon;
          const d = byType[t];
          const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
          return (
            <button key={t} onClick={() => goTo({ tab: "library", type: t })} className="mt-card p-4 text-left flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon size={16} />
                <span className="font-semibold mt-display-sm">{cfg.plural}</span>
              </div>
              <div className="mt-progress-track">
                <div className="mt-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs mt-ink-soft">{d.done} de {d.total} completados</div>
            </button>
          );
        })}
      </div>

      <div className="mt-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold mt-display-sm">Actividad reciente</h2>
          <button className="text-xs mt-ink-soft flex items-center gap-1 hover:underline" onClick={() => goTo({ tab: "timeline" })}>
            Ver línea temporal <ChevronRight size={13} />
          </button>
        </div>
        {recent.length === 0 && <EmptyState text="Aún no hay actividad. ¡Añade tu primer elemento!" />}
        <div className="flex flex-col divide-y mt-line">
          {recent.map((it) => (
            <ItemRow key={it.id} item={it} saga={sagaMap[it.sagaId]} onClick={() => onOpenItem(it)} />
          ))}
        </div>
      </div>
    </div>
  );
}
