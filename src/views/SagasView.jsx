import React, { useMemo, useState } from "react";
import { Plus, Layers, ChevronLeft, ChevronUp, ChevronDown, Pencil, GripVertical, Check } from "lucide-react";
import { isDone, TYPE_CONFIG } from "../lib/model";
import { EmptyState, Btn, CoverThumb, TypeIcon, StatusPill, PriorityPill } from "../components/ui/atoms";
import { extraLine } from "../components/ItemCard";

/* ============================================================
   SAGAS
   ============================================================ */

export function sagaProgress(sagaId, items) {
  const list = items.filter((i) => i.sagaId === sagaId);
  const done = list.filter(isDone).length;
  return { total: list.length, done, list };
}

export function SagasView({ sagas, items, onOpenSaga, onAddSaga }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mt-page-title">Sagas y franquicias</h1>
          <p className="mt-ink-soft text-sm">Agrupa juegos, animes, mangas y películas por universo.</p>
        </div>
        <Btn variant="primary" onClick={onAddSaga}><Plus size={15} /> Nueva saga</Btn>
      </div>
      {sagas.length === 0 && <EmptyState text="Todavía no has creado ninguna saga." action={<Btn variant="primary" onClick={onAddSaga}><Plus size={15} /> Crear tu primera saga</Btn>} />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sagas.map((s) => {
          const { total, done } = sagaProgress(s.id, items);
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <button key={s.id} onClick={() => onOpenSaga(s.id)} className="mt-card p-4 text-left flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Layers size={16} />
                <span className="font-semibold mt-display-sm">{s.name}</span>
              </div>
              {s.description && <p className="text-xs mt-ink-soft line-clamp-2">{s.description}</p>}
              <div className="mt-progress-track mt-1">
                <div className="mt-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs mt-ink-soft mt-mono">{done} de {total} completados</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function groupByArc(list) {
  const groups = [];
  let current = null;
  for (const it of list) {
    const arc = it.arc || "";
    if (!current || current.arc !== arc) {
      current = { arc, items: [] };
      groups.push(current);
    }
    current.items.push(it);
  }
  return groups;
}

function SagaInfoBlock({ title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-info-block">
      <button type="button" className="mt-info-block-header" onClick={() => setOpen((o) => !o)}>
        <span className="font-semibold mt-display-sm">{title}</span>
        <span className="text-xs mt-ink-soft">{open ? "Mostrar menos" : "Leer más"}</span>
      </button>
      {open && <div className="mt-info-block-body text-sm mt-ink-soft whitespace-pre-line">{body}</div>}
    </div>
  );
}

function ArcDivider({ arc, editMode, onRename }) {
  if (!editMode) return <div className="mt-arc-divider">{arc}</div>;
  return (
    <input
      key={arc}
      defaultValue={arc}
      className="mt-arc-divider mt-arc-divider-input"
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next && next !== arc) onRename(arc, next);
      }}
    />
  );
}

function SagaTimelineCard({ item, onClick }) {
  return (
    <button onClick={onClick} className="mt-saga-timeline-card text-left">
      <CoverThumb item={item} size="sm" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="text-xs mt-ink-soft flex items-center gap-1 uppercase tracking-wide">
          <TypeIcon type={item.type} size={11} /> {TYPE_CONFIG[item.type].label}
          {item.releaseDate && <span>· {item.releaseDate.slice(0, 4)}</span>}
        </div>
        <div className="font-semibold mt-display-sm leading-snug">{item.title}</div>
        <div className="flex items-center gap-1 flex-wrap">
          <StatusPill item={item} />
          <PriorityPill item={item} />
        </div>
        {extraLine(item) && <div className="text-xs mt-ink-soft mt-mono">{extraLine(item)}</div>}
      </div>
    </button>
  );
}

function SagaTimeline({ groups, onOpenItem, onReorder, canReorder, editMode, onRenameArc, onEditItemField, onDragReorder }) {
  const flat = groups.flatMap((g) => g.items);
  const [dragId, setDragId] = useState(null);
  const canDrag = editMode && canReorder;
  let seen = 0;

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const fromIdx = flat.findIndex((it) => it.id === dragId);
    const toIdx = flat.findIndex((it) => it.id === targetId);
    setDragId(null);
    if (fromIdx === -1 || toIdx === -1) return;
    const arr = [...flat];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    onDragReorder(arr.map((it) => it.id));
  };

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {group.arc && <ArcDivider arc={group.arc} editMode={editMode} onRename={onRenameArc} />}
          {group.items.map((it) => {
            const flatIdx = seen;
            seen += 1;
            const isLast = seen === flat.length;
            return (
              <div
                key={it.id}
                className={`mt-saga-timeline-row ${canDrag && dragId === it.id ? "mt-dragging" : ""}`}
                draggable={canDrag}
                onDragStart={() => setDragId(it.id)}
                onDragOver={(e) => { if (canDrag) e.preventDefault(); }}
                onDrop={() => canDrag && handleDrop(it.id)}
              >
                <div className="mt-saga-timeline-info">
                  {editMode ? (
                    <>
                      <input
                        className="mt-inline-edit mt-label"
                        defaultValue={it.era || (it.releaseDate ? it.releaseDate.slice(0, 4) : "")}
                        placeholder="Año / era"
                        onBlur={(e) => onEditItemField(it.id, "era", e.target.value)}
                      />
                      <textarea
                        className="mt-inline-edit text-xs"
                        rows={2}
                        defaultValue={it.notes}
                        placeholder="Descripción..."
                        onBlur={(e) => onEditItemField(it.id, "notes", e.target.value)}
                      />
                    </>
                  ) : (
                    <>
                      {(it.era || it.releaseDate) && (
                        <div className="mt-label mb-1">{it.era || it.releaseDate.slice(0, 4)}</div>
                      )}
                      {it.notes && <p className="text-xs mt-ink-soft leading-relaxed">{it.notes}</p>}
                    </>
                  )}
                </div>
                <div className="mt-saga-timeline-marker">
                  {canDrag && <GripVertical size={12} className="mt-ink-soft" style={{ cursor: "grab" }} />}
                  {canReorder && !editMode && (
                    <button type="button" disabled={flatIdx === 0} className="mt-icon-btn" onClick={() => onReorder(it, flat[flatIdx - 1])}>
                      <ChevronUp size={12} />
                    </button>
                  )}
                  <div className="mt-timeline-dot" />
                  {!isLast && <div className="mt-timeline-line" />}
                  {canReorder && !editMode && (
                    <button type="button" disabled={isLast} className="mt-icon-btn" onClick={() => onReorder(it, flat[flatIdx + 1])}>
                      <ChevronDown size={12} />
                    </button>
                  )}
                </div>
                <SagaTimelineCard item={it} onClick={() => onOpenItem(it)} />
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

export function SagaDetailView({ saga, items, onBack, onOpenItem, onAdd, onEditSaga, onOrderModeChange, onReorder, onRenameArc, onEditItemField, onDragReorder }) {
  const [editMode, setEditMode] = useState(false);
  const { total, done, list } = sagaProgress(saga.id, items);
  const pct = total ? Math.round((done / total) * 100) : 0;

  const ordered = useMemo(() => {
    const arr = [...list];
    if (saga.orderMode === "chronological") {
      arr.sort((a, b) => {
        const av = a.chronoOrder !== "" && a.chronoOrder != null ? Number(a.chronoOrder) : Infinity;
        const bv = b.chronoOrder !== "" && b.chronoOrder != null ? Number(b.chronoOrder) : Infinity;
        if (av !== bv) return av - bv;
        return a.createdAt - b.createdAt;
      });
    } else {
      arr.sort((a, b) => {
        const av = a.releaseDate ? new Date(a.releaseDate).getTime() : a.releaseOrder !== "" ? Number(a.releaseOrder) : Infinity;
        const bv = b.releaseDate ? new Date(b.releaseDate).getTime() : b.releaseOrder !== "" ? Number(b.releaseOrder) : Infinity;
        if (av !== bv) return av - bv;
        return a.createdAt - b.createdAt;
      });
    }
    return arr;
  }, [list, saga.orderMode]);

  const groups = useMemo(() => groupByArc(ordered), [ordered]);
  const infoBlocks = saga.infoBlocks || [];
  const canReorder = saga.orderMode === "chronological";

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="mt-back-link"><ChevronLeft size={15} /> Todas las sagas</button>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="mt-page-title flex items-center gap-2"><Layers size={20} />{saga.name}</h1>
          {saga.description && <p className="mt-ink-soft text-sm max-w-xl">{saga.description}</p>}
        </div>
        <div className="flex gap-2">
          <Btn variant="subtle" onClick={onEditSaga}><Pencil size={14} /> Editar saga</Btn>
          <Btn variant={editMode ? "primary" : "subtle"} onClick={() => setEditMode((m) => !m)}>
            {editMode ? <Check size={14} /> : <Pencil size={14} />} {editMode ? "Terminar edición" : "Modo edición"}
          </Btn>
          <Btn variant="primary" onClick={onAdd}><Plus size={15} /> Añadir a la saga</Btn>
        </div>
      </div>

      <div className="mt-card p-4 flex items-center gap-4">
        <div className="mt-progress-track flex-1">
          <div className="mt-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="mt-mono text-sm whitespace-nowrap">{done} de {total} completados</span>
      </div>

      {infoBlocks.length > 0 && (
        <div className="flex flex-col gap-2">
          {infoBlocks.map((b) => <SagaInfoBlock key={b.id} title={b.title || "Sin título"} body={b.body} />)}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="mt-label">Ordenar por:</span>
        <div className="mt-view-toggle">
          <button className={saga.orderMode === "chronological" ? "active" : ""} onClick={() => onOrderModeChange("chronological")}>Historia</button>
          <button className={saga.orderMode === "release" ? "active" : ""} onClick={() => onOrderModeChange("release")}>Lanzamiento</button>
        </div>
        {editMode ? (
          <span className="text-xs mt-accent-text">
            Edita el título de arco, el año y la descripción directamente.
            {canReorder ? " También puedes arrastrar las tarjetas para reordenar." : " Cambia a 'Historia' para poder arrastrar y reordenar."}
          </span>
        ) : (
          <span className="text-xs mt-ink-soft">Activa el modo edición para editar textos{canReorder ? " y arrastrar para reordenar" : ""}.</span>
        )}
      </div>

      {ordered.length === 0 && <EmptyState text="Esta saga aún no tiene elementos." />}
      {ordered.length > 0 && (
        <SagaTimeline
          groups={groups}
          onOpenItem={onOpenItem}
          onReorder={onReorder}
          canReorder={canReorder}
          editMode={editMode}
          onRenameArc={onRenameArc}
          onEditItemField={onEditItemField}
          onDragReorder={onDragReorder}
        />
      )}
    </div>
  );
}
