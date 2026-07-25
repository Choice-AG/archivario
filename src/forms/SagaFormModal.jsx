import React, { useState } from "react";
import { Save, Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { uid } from "../lib/model";
import { Modal, Field, TInput, TSelect, TTextArea, Btn, ConfirmInline } from "../components/ui/atoms";

function emptySaga() {
  return { id: uid(), name: "", description: "", orderMode: "chronological", infoBlocks: [] };
}

export function SagaFormModal({ initial, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(() => (initial ? { infoBlocks: [], ...initial } : emptySaga()));
  const isEdit = !!initial;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addBlock = () => set("infoBlocks", [...form.infoBlocks, { id: uid(), title: "", body: "" }]);
  const updateBlock = (id, k, v) => set("infoBlocks", form.infoBlocks.map((b) => (b.id === id ? { ...b, [k]: v } : b)));
  const removeBlock = (id) => set("infoBlocks", form.infoBlocks.filter((b) => b.id !== id));
  const moveBlock = (idx, dir) => {
    const arr = [...form.infoBlocks];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    set("infoBlocks", arr);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <Modal title={isEdit ? "Editar saga" : "Nueva saga / franquicia"} onClose={onClose} wide>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre">
          <TInput required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Final Fantasy, Dragon Ball..." />
        </Field>
        <Field label="Descripción">
          <TTextArea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Orden por defecto">
          <TSelect value={form.orderMode} onChange={(e) => set("orderMode", e.target.value)}>
            <option value="chronological">Cronológico (historia)</option>
            <option value="release">Lanzamiento</option>
          </TSelect>
        </Field>

        <div className="flex flex-col gap-3 pt-2 border-t mt-line">
          <div className="flex items-center justify-between">
            <span className="mt-label">Bloques de información</span>
            <Btn type="button" variant="subtle" onClick={addBlock}><Plus size={14} /> Añadir bloque</Btn>
          </div>
          <p className="text-xs mt-ink-soft -mt-1">
            Se muestran como tarjetas desplegables en la página de la saga (ej. "Los puntos fuertes de...", "Roadmap de la guía").
          </p>

          {form.infoBlocks.length === 0 && (
            <p className="text-xs mt-ink-soft italic">Todavía no has añadido ningún bloque.</p>
          )}

          {form.infoBlocks.map((block, idx) => (
            <div key={block.id} className="mt-subtle-box p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TInput
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, "title", e.target.value)}
                  placeholder="Título del bloque..."
                  className="flex-1"
                />
                <button type="button" disabled={idx === 0} onClick={() => moveBlock(idx, -1)} className="mt-icon-btn"><ChevronUp size={14} /></button>
                <button type="button" disabled={idx === form.infoBlocks.length - 1} onClick={() => moveBlock(idx, 1)} className="mt-icon-btn"><ChevronDown size={14} /></button>
                <button type="button" onClick={() => removeBlock(block.id)} className="mt-icon-btn"><X size={14} /></button>
              </div>
              <TTextArea
                rows={3}
                value={block.body}
                onChange={(e) => updateBlock(block.id, "body", e.target.value)}
                placeholder="Texto del bloque..."
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t mt-line">
          <div>{isEdit && <ConfirmInline label="Eliminar saga" onConfirm={() => onDelete(form.id)} />}</div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose} type="button">Cancelar</Btn>
            <Btn variant="primary" type="submit"><Save size={14} /> Guardar</Btn>
          </div>
        </div>
      </form>
    </Modal>
  );
}
