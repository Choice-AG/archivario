"use client";
import { useEffect, useState } from "react";
import { Download, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { backupSchema } from "../application/validation";
import {
  dateInZone,
  importPreview,
  type Backup,
  type Library,
  type Profile,
} from "../domain/model";
import { avatarColors, type AvatarColor } from "../domain/profile";
import { libraryToCsv } from "../domain/import-sources";
import { Avatar, type ApiRequest, type Execute } from "./shared";
import { TimezoneField } from "./timezone-field";
import { ThemePicker } from "./theme";
import { ImportGames } from "./import-games";
import { SocialSettings } from "@/features/social/presentation/social-pages";

const avatarColorLabels: Record<AvatarColor, string> = {
  violeta: "Violeta",
  rosa: "Rosa",
  ambar: "Ámbar",
  verde: "Verde",
  azul: "Azul",
  gris: "Gris",
};
const sections = [
  ["perfil", "Perfil"],
  ["social", "Perfil público"],
  ["apariencia", "Apariencia"],
  ["copia", "Copia de seguridad"],
  ["importar", "Importar juegos"],
  ["cuenta", "Cuenta"],
] as const;
type Section = (typeof sections)[number][0];
type Feedback = { section: Section; text: string; error: boolean };

const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "No se ha podido guardar.";

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Cada sección muestra sus propios avisos y errores, junto a lo que se hizo.
function SectionFeedback({
  section,
  feedback,
}: {
  section: Section;
  feedback?: Feedback;
}) {
  const mine = feedback?.section === section ? feedback : undefined;
  return mine?.error ? (
    <p className="form-error" role="alert">
      {mine.text}
    </p>
  ) : (
    <p role="status" className="text-sm accent-text mt-3">
      {mine?.text}
    </p>
  );
}

function SettingsSection({
  id,
  title,
  children,
}: {
  id: Section;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="settings-section"
      id={"ajustes-" + id}
      aria-labelledby={"ajustes-" + id + "-title"}
    >
      <h2 id={"ajustes-" + id + "-title"}>{title}</h2>
      {children}
    </section>
  );
}

export function SettingsPanel({
  state,
  execute,
  request,
  demo,
  onClose,
}: {
  state: Library;
  execute: Execute;
  request: ApiRequest;
  demo: boolean;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState<Feedback>(),
    [pending, setPending] = useState(false),
    [incoming, setIncoming] = useState<Backup>(),
    [policy, setPolicy] = useState<"skip" | "replace">("skip"),
    [confirm, setConfirm] = useState("");
  // El perfil se edita entero y se guarda con un solo botón.
  const saved = state.profile;
  const [draft, setDraft] = useState<Profile>(saved);
  const fields = ["name", "bio", "timezone", "avatarColor"] as const;
  const dirty = fields.some((k) => (draft[k] ?? "") !== (saved[k] ?? ""));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const run = async (section: Section, task: () => Promise<string | void>) => {
    setPending(true);
    setFeedback(undefined);
    try {
      const done = await task();
      if (done) setFeedback({ section, text: done, error: false });
    } catch (e) {
      setFeedback({ section, text: errorText(e), error: true });
    } finally {
      setPending(false);
    }
  };
  const preview = incoming ? importPreview(state, incoming.data) : undefined;
  const stamp = dateInZone(new Date(), state.profile.timezone);
  const color = draft.avatarColor ?? "violeta";
  return (
    <div className="settings-sections">
      {/* Índice de secciones: la página es larga y así se salta directo. */}
      <nav className="settings-index" aria-label="Secciones de los ajustes">
        {sections.map(([id, title]) => (
          <a key={id} href={"#ajustes-" + id}>
            {title}
          </a>
        ))}
      </nav>

      <SettingsSection id="perfil" title="Perfil">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("perfil", async () => {
              const profile: Profile = {
                ...saved,
                name: draft.name.trim(),
                bio: draft.bio.trim(),
                timezone: draft.timezone,
                avatarColor: draft.avatarColor,
              };
              await execute({ type: "profile", profile });
              setDraft(profile);
              return "Perfil guardado.";
            });
          }}
        >
          <label>
            Nombre
            <input
              name="name"
              value={draft.name}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Bio <small>Opcional</small>
            <textarea
              name="bio"
              rows={2}
              value={draft.bio}
              maxLength={300}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </label>
          <TimezoneField
            name="timezone"
            defaultValue={saved.timezone}
            onChange={(timezone) => setDraft({ ...draft, timezone })}
          />
          <p className="info-note">
            Cambiar la zona horaria afecta a «hoy». Las fechas ya registradas no
            se desplazan.
          </p>
          <fieldset className="avatar-picker">
            <legend>Color del avatar</legend>
            <div className="profile-avatar-preview">
              <Avatar profile={draft} />
              <div
                className="avatar-swatches"
                role="radiogroup"
                aria-label="Color del avatar"
              >
                {avatarColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={color === c}
                    aria-label={avatarColorLabels[c]}
                    className={"avatar-swatch avatar-" + c}
                    onClick={() => setDraft({ ...draft, avatarColor: c })}
                  />
                ))}
              </div>
            </div>
          </fieldset>
          <div className="settings-save">
            <Button disabled={pending || !dirty}>
              <Save size={16} /> Guardar perfil
            </Button>
            {dirty && (
              <>
                <span className="unsaved" role="status">
                  Tienes cambios sin guardar.
                </span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setDraft(saved)}
                >
                  Descartar
                </button>
              </>
            )}
          </div>
        </form>
        <SectionFeedback section="perfil" feedback={feedback} />
      </SettingsSection>

      <SettingsSection id="social" title="Perfil público">
        <SocialSettings request={request} demo={demo} />
      </SettingsSection>

      <SettingsSection id="apariencia" title="Apariencia">
        <p className="muted text-sm mb-3">
          Estos cambios se aplican al momento.
        </p>
        <ThemePicker />
        <label className="checkbox-label mt-4">
          <input
            type="checkbox"
            checked={saved.celebrate !== false}
            disabled={pending}
            onChange={(e) =>
              run("apariencia", async () => {
                await execute({
                  type: "profile",
                  profile: { ...saved, celebrate: e.target.checked },
                });
              })
            }
          />{" "}
          Celebrar cuando completo un juego
        </label>
        <SectionFeedback section="apariencia" feedback={feedback} />
      </SettingsSection>

      <SettingsSection id="copia" title="Copia de seguridad">
        <p className="muted text-sm mb-3">
          Tu biblioteca te pertenece. Descarga una copia con tus juegos,
          partidas, notas y días de actividad, o recupera una que ya tengas.
        </p>
        <div className="form-actions">
          <Button
            variant="secondary"
            onClick={() =>
              save(
                "archivario-" + stamp + ".json",
                new Blob(
                  [
                    JSON.stringify(
                      {
                        version: 1,
                        exportedAt: new Date().toISOString(),
                        data: state,
                      } satisfies Backup,
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                ),
              )
            }
          >
            <Download size={16} /> Descargar copia (JSON)
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              save(
                "archivario-" + stamp + ".csv",
                new Blob([libraryToCsv(state)], {
                  type: "text/csv;charset=utf-8",
                }),
              )
            }
          >
            <Download size={16} /> Exportar a hoja de cálculo (CSV)
          </Button>
          <label className="upload-label">
            <Upload size={16} /> Recuperar una copia
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFeedback(undefined);
                setIncoming(undefined);
                try {
                  if (file.size > 500000)
                    throw new Error("El archivo supera los 500 KB.");
                  setIncoming(
                    backupSchema.parse(JSON.parse(await file.text())),
                  );
                } catch (err) {
                  setFeedback({
                    section: "copia",
                    text: "No se puede importar: " + errorText(err),
                    error: true,
                  });
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {incoming && preview && (
          <div className="import-preview">
            <h3>Vista previa · formato v1</h3>
            <p>
              {preview.newGames} juegos nuevos · {preview.duplicates.length}{" "}
              duplicados · {preview.activities} actividades en el archivo
            </p>
            {preview.duplicates.length > 0 && (
              <p className="muted">
                Duplicados: {preview.duplicates.join(", ")}
              </p>
            )}
            <label>
              Política de importación
              <select
                value={policy}
                onChange={(e) =>
                  setPolicy(e.target.value as "skip" | "replace")
                }
              >
                <option value="skip">
                  Añadir nuevos; omitir juegos duplicados completos
                </option>
                <option value="replace">
                  Reemplazar toda mi biblioteca y perfil
                </option>
              </select>
            </label>
            <p className="info-note">
              {policy === "skip"
                ? "Los duplicados conservan sus partidas y actividad actuales. Los nuevos se añaden fuera de «Próximos»."
                : "Se sustituirán todos tus juegos, partidas, actividad y perfil por el archivo. Descarga antes una copia si quieres conservarlos."}
            </p>
            <Button
              disabled={pending}
              onClick={() =>
                run("copia", async () => {
                  await execute({
                    type: "import",
                    data: incoming.data,
                    policy,
                  });
                  setIncoming(undefined);
                  return "Importación completada.";
                })
              }
            >
              Confirmar importación
            </Button>
          </div>
        )}
        <SectionFeedback section="copia" feedback={feedback} />
      </SettingsSection>

      <SettingsSection id="importar" title="Importar juegos">
        <ImportGames
          state={state}
          execute={execute}
          request={request}
          demo={demo}
        />
      </SettingsSection>

      <SettingsSection id="cuenta" title="Cuenta">
        <div className="danger-area">
          <h3>
            {demo
              ? "Borrar datos de demostración"
              : "Eliminar cuenta y todos mis datos"}
          </h3>
          <p className="muted text-sm my-3">
            {demo
              ? "Esto vacía los ejemplos guardados en este navegador."
              : "Se borrarán perfil, juegos, partidas, actividad. Esta acción no se puede deshacer. Requiere haber iniciado sesión en los últimos cinco minutos."}
          </p>
          <label>
            Escribe ELIMINAR
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <Button
            variant="destructive"
            disabled={confirm !== "ELIMINAR" || pending}
            onClick={() =>
              run("cuenta", async () => {
                if (demo) {
                  await execute({
                    type: "import",
                    policy: "replace",
                    data: {
                      revision: 0,
                      games: [],
                      runs: [],
                      activities: [],
                      profile: {
                        name: "",
                        bio: "",
                        timezone: state.profile.timezone,
                      },
                    },
                  });
                  onClose();
                  return;
                }
                await request("/api/account", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ confirm }),
                });
                const { signOut } = await import("firebase/auth");
                const { clientAuth } =
                  await import("@/features/account/firebase-client");
                await signOut(clientAuth());
              })
            }
          >
            <Trash2 size={16} />{" "}
            {demo ? "Borrar demostración" : "Eliminar cuenta"}
          </Button>
        </div>
        <SectionFeedback section="cuenta" feedback={feedback} />
      </SettingsSection>
    </div>
  );
}
