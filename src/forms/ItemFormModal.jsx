import React, { useState, useEffect } from "react";
import { Save, Plus } from "lucide-react";
import { TYPE_CONFIG, TYPE_LIST, PENDING_STATUS, PRIORITY_LEVELS, DEFAULT_PRIORITY, uid } from "../lib/model";
import { Modal, Field, TInput, TSelect, TTextArea, Btn, ConfirmInline, CoverThumb } from "../components/ui/atoms";
import { ExternalSearch } from "./ExternalSearch";
import { SagaFormModal } from "./SagaFormModal";
import { searchAnilist } from "../lib/api/anilist";
import { searchRawg } from "../lib/api/rawg";

export function emptyItem(type, sagaId) {
  return {
    id: uid(), type, title: "", cover: "", sagaId: sagaId || "",
    status: PENDING_STATUS[type], score: "", tags: [], priorityLevel: DEFAULT_PRIORITY,
    platform: "", hours: "", currentVolume: "", currentChapter: "",
    season: "", currentEpisode: "",
    startDate: "", endDate: "", releaseDate: "",
    chronoOrder: "", releaseOrder: "", priority: 9999, arc: "", era: "",
    notes: "", createdAt: Date.now(), updatedAt: Date.now(),
  };
}

export function ItemFormModal({ initial, sagas, defaultType, defaultSagaId, onSave, onClose, onDelete, onCreateSaga }) {
  const [type, setType] = useState(initial ? initial.type : defaultType || "game");
  const [form, setForm] = useState(() => initial || emptyItem(type, defaultSagaId));
  const [tagsText, setTagsText] = useState(() => (initial?.tags || []).join(", "));
  const [quickSaga, setQuickSaga] = useState(false);
  const isEdit = !!initial;

  useEffect(() => {
    if (!isEdit) setForm((f) => ({ ...emptyItem(type, defaultSagaId), title: f.title, cover: f.cover, sagaId: f.sagaId, priorityLevel: f.priorityLevel }));
    // eslint-disable-next-line
  }, [type]);

  const cfg = TYPE_CONFIG[type];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({ ...form, type, tags, updatedAt: Date.now() });
  };

  return (
    <Modal title={isEdit ? "Editar elemento" : "Añadir elemento"} onClose={onClose} wide>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!isEdit && (
          <div className="flex gap-2 flex-wrap">
            {TYPE_LIST.map((t) => {
              const Icon = TYPE_CONFIG[t].icon;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`mt-type-chip ${type === t ? "mt-type-chip-active" : ""}`}
                >
                  <Icon size={15} /> {TYPE_CONFIG[t].label}
                </button>
              );
            })}
          </div>
        )}

        {!isEdit && (type === "anime" || type === "manga") && (
          <ExternalSearch
            placeholder={`Buscar ${type === "anime" ? "anime" : "manga"} en AniList...`}
            search={(q) => searchAnilist(type, q)}
            onPick={(r) => {
              set("title", r.title);
              set("cover", r.cover);
              if (r.releaseDate) set("releaseDate", r.releaseDate);
            }}
          />
        )}

        {!isEdit && type === "game" && (
          <ExternalSearch
            placeholder="Buscar videojuego en RAWG..."
            search={searchRawg}
            onPick={(r) => {
              set("title", r.title);
              set("cover", r.cover);
              if (r.releaseDate) set("releaseDate", r.releaseDate);
              if (r.platform) set("platform", r.platform);
            }}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 flex flex-col gap-4">
            <Field label="Título">
              <TInput required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Nombre..." />
            </Field>
            <Field label="URL de carátula/portada" hint="Pega un enlace de imagen (opcional)">
              <TInput value={form.cover} onChange={(e) => set("cover", e.target.value)} placeholder="https://..." />
            </Field>
          </div>
          <Field label="Vista previa">
            <div className="mt-preview-cover">
              <CoverThumb item={{ ...form, type }} />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Field label="Estado">
            <TSelect value={form.status} onChange={(e) => set("status", e.target.value)}>
              {cfg.statuses.map((s) => (
                <option key={s.v} value={s.v}>{s.l}</option>
              ))}
            </TSelect>
          </Field>
          <Field label="Prioridad">
            <TSelect value={form.priorityLevel || DEFAULT_PRIORITY} onChange={(e) => set("priorityLevel", e.target.value)}>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p.v} value={p.v}>{p.l}</option>
              ))}
            </TSelect>
          </Field>
          <Field label="Puntuación (0-10)">
            <TInput type="number" min="0" max="10" step="0.5" value={form.score} onChange={(e) => set("score", e.target.value)} />
          </Field>
          <Field label="Saga / franquicia">
            <div className="flex gap-1.5">
              <TSelect value={form.sagaId} onChange={(e) => set("sagaId", e.target.value)} className="flex-1">
                <option value="">Sin saga</option>
                {sagas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </TSelect>
              <Btn type="button" variant="subtle" onClick={() => setQuickSaga(true)} title="Crear nueva saga">
                <Plus size={14} />
              </Btn>
            </div>
          </Field>
          <Field label="Tags / géneros" hint="separados por comas">
            <TInput value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="shonen, rpg..." />
          </Field>
        </div>

        {cfg.extraFields.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {cfg.extraFields.map((f) => (
              <Field key={f.key} label={f.label}>
                <TInput type={f.type} value={form[f.key]} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
              </Field>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Fecha de inicio">
            <TInput type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field label="Fecha de fin">
            <TInput type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </Field>
          <Field label="Fecha de lanzamiento" hint="para orden por saga">
            <TInput type="date" value={form.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} />
          </Field>
        </div>

        {form.sagaId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-subtle-box p-3">
            <Field label="Orden cronológico (historia)" hint="número, menor = antes">
              <TInput type="number" value={form.chronoOrder} onChange={(e) => set("chronoOrder", e.target.value)} />
            </Field>
            <Field label="Orden de lanzamiento" hint="si no hay fecha de lanzamiento">
              <TInput type="number" value={form.releaseOrder} onChange={(e) => set("releaseOrder", e.target.value)} />
            </Field>
            <Field label="Arco / bloque" hint="para agrupar en la línea temporal">
              <TInput value={form.arc} onChange={(e) => set("arc", e.target.value)} placeholder="Arco de Liberl..." />
            </Field>
            <Field label="Era / etiqueta" hint="texto libre, ej. 'S. 1202' (si no, se usa el año)">
              <TInput value={form.era} onChange={(e) => set("era", e.target.value)} placeholder="S. 1202..." />
            </Field>
          </div>
        )}

        <Field label="Notas">
          <TTextArea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <div className="flex items-center justify-between pt-2 border-t mt-line">
          <div>{isEdit && <ConfirmInline label="Eliminar" onConfirm={() => onDelete(form.id)} />}</div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose} type="button">Cancelar</Btn>
            <Btn variant="primary" type="submit"><Save size={14} /> Guardar</Btn>
          </div>
        </div>
      </form>

      {quickSaga && (
        <SagaFormModal
          onSave={(saga) => {
            onCreateSaga(saga);
            set("sagaId", saga.id);
            setQuickSaga(false);
          }}
          onClose={() => setQuickSaga(false)}
        />
      )}
    </Modal>
  );
}
