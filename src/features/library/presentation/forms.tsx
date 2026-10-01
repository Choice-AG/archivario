"use client";
import { formatDate, statusLabel } from "./format";
import { StatusMenu } from "./status-menu";
import { GameTimeForm } from "./game-times";
import { CatalogDetails } from "./catalog-details";
import { useState } from "react";
import { Trash2, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activityId,
  type Activity,
  type Game,
  type Library,
  type Run,
} from "../domain/model";
import type { ApiRequest, Execute } from "./shared";

import { list, value } from "./form-utils";
import { RatingInput } from "./rating-input";
import { markdownHint } from "./markdown";

function FormError({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
function message(e: unknown) {
  return e instanceof Error ? e.message : "No se ha podido guardar.";
}
export { AddGame } from "./add-game";

export function GameDetails({
  game,
  state,
  execute,
  onClose,
  onActivity,
  request,
  demo,
  initialSection = "Ficha",
}: {
  initialSection?: string;
  request: ApiRequest;
  demo: boolean;
  game: Game;
  state: Library;
  execute: Execute;
  onClose: () => void;
  onActivity: () => void;
}) {
  const tab = initialSection;
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div>
      <FormError message={error} />
      {tab === "Ficha" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError("");
            const f = new FormData(e.currentTarget);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { rating: _rating, approximateHours: _hours, ...base } = game;
            try {
              await execute({
                type: "save-game",
                game: {
                  ...base,
                  title: value(f, "title"),
                  platforms: list(value(f, "platforms")),
                  stores: list(value(f, "stores")),
                  genres: list(value(f, "genres")),
                  wishlist: f.has("wishlist"),
                  favorite: f.has("favorite"),
                  next: f.has("next"),
                  ...(value(f, "rating")
                    ? { rating: Number(f.get("rating")) }
                    : {}),
                  ...(value(f, "duration")
                    ? { approximateHours: Number(f.get("duration")) }
                    : {}),
                },
              });
            } catch (e) {
              setError(message(e));
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Título
            <input
              name="title"
              defaultValue={game.title}
              required
              maxLength={160}
            />
          </label>
          <div className="form-grid">
            <label>
              Plataformas
              <input
                name="platforms"
                defaultValue={game.platforms.join(", ")}
                required
              />
            </label>
            <label>
              Tiendas
              <input name="stores" defaultValue={game.stores.join(", ")} />
            </label>
          </div>
          <label>
            Géneros
            <input name="genres" defaultValue={game.genres.join(", ")} />
          </label>
          <div className="form-grid">
            <div className="rating-field">
              <span className="rating-label">Tu valoración</span>
              <RatingInput
                name="rating"
                label="Tu valoración"
                defaultValue={game.rating}
              />
            </div>
            <label>
              Duración aproximada (h)
              <input
                name="duration"
                type="number"
                min={0}
                max={10000}
                step={0.5}
                defaultValue={game.approximateHours}
              />
            </label>
          </div>
          <div className="check-row">
            <label>
              <input
                type="checkbox"
                name="wishlist"
                defaultChecked={game.wishlist}
              />{" "}
              Lista de deseos (aún no lo tengo)
            </label>
            <label>
              <input
                type="checkbox"
                name="favorite"
                defaultChecked={game.favorite}
              />{" "}
              Favorito
            </label>
            <label>
              <input type="checkbox" name="next" defaultChecked={game.next} />{" "}
              Entre mis próximos tres
            </label>
          </div>
          <div className="form-actions">
            <Button disabled={pending}>
              <Save size={16} /> Guardar ficha
            </Button>
            <Button type="button" variant="secondary" onClick={onActivity}>
              Registrar actividad
            </Button>
          </div>
          <div className="danger-area">
            {confirmDelete ? (
              <>
                <p>
                  Se eliminarán el juego, sus partidas y toda su actividad.
                  Podrás deshacerlo antes de otra edición o de recargar.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={async () => {
                    setPending(true);
                    try {
                      await execute({ type: "delete-game", id: game.id });
                      onClose();
                    } catch (e) {
                      setError(message(e));
                      setPending(false);
                    }
                  }}
                >
                  Eliminar definitivamente
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} /> Eliminar juego
              </Button>
            )}
          </div>
        </form>
      )}
      {tab === "Tiempos" && (
        <GameTimeForm
          key={game.id}
          game={game}
          state={state}
          execute={execute}
          request={request}
          demo={demo}
        />
      )}
      {tab === "IGDB" && (
        <CatalogDetails
          catalogId={game.catalogId}
          request={request}
          demo={demo}
        />
      )}
      {tab === "Notas" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setPending(true);
            try {
              await execute({
                type: "save-game",
                game: {
                  ...game,
                  review: value(f, "review"),
                  spoilerNote: value(f, "spoilers"),
                },
              });
            } catch (e) {
              setError(message(e));
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Tu reseña personal
            <textarea
              name="review"
              rows={5}
              maxLength={5000}
              defaultValue={game.review}
              placeholder="¿Qué te está haciendo sentir este juego?"
              aria-describedby="review-format"
            />
          </label>
          <p id="review-format" className="field-hint">
            {markdownHint}
          </p>
          <details className="spoiler">
            <summary>Mostrar notas con spoilers</summary>
            <label className="mt-4">
              Notas privadas con spoilers
              <textarea
                name="spoilers"
                rows={5}
                maxLength={5000}
                defaultValue={game.spoilerNote}
              />
            </label>
          </details>
          <p className="info-note">
            Estas notas son privadas. «Dónde lo dejé» se guarda por separado en
            cada partida.
          </p>
          <Button disabled={pending}>
            <Save size={16} /> Guardar notas
          </Button>
        </form>
      )}
    </div>
  );
}
export function RunForm({
  run,
  game,
  execute,
  today,
  onDone,
  onCancel,
}: {
  run?: Run;
  game: Game;
  execute: Execute;
  today?: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [status, setStatus] = useState(run?.status ?? "jugando"),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="run-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget),
          hasTime = value(f, "hours") !== "" || value(f, "minutes") !== "";
        try {
          await execute({
            type: "save-run",
            primary: f.has("primary"),
            run: {
              id: run?.id ?? crypto.randomUUID(),
              gameId: game.id,
              label: value(f, "label"),
              platform: value(f, "platform"),
              status,
              completion: value(f, "completion") as Run["completion"],
              startedOn: value(f, "startedOn"),
              ...(status === "completado"
                ? { completedOn: value(f, "completedOn") }
                : {}),
              whereLeft: value(f, "whereLeft"),
              review: value(f, "runReview"),
              ...(value(f, "runRating")
                ? { rating: Number(f.get("runRating")) }
                : {}),
              ...(hasTime
                ? {
                    completionMinutes:
                      Number(f.get("hours") || 0) * 60 +
                      Number(f.get("minutes") || 0),
                  }
                : {}),
            },
          });
          onDone?.();
        } catch (e) {
          setError(message(e));
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="form-grid">
        <label>
          Nombre de la partida
          <input
            name="label"
            defaultValue={run?.label ?? "Nueva aventura"}
            required
            maxLength={80}
          />
        </label>
        <label>
          Plataforma
          <input
            name="platform"
            defaultValue={run?.platform ?? game.platforms[0]}
            required
            maxLength={60}
          />
        </label>
      </div>
      <div className="form-grid">
        <div className="rating-field">
          <span className="rating-label">Estado</span>
          <StatusMenu
            label="Estado de esta partida"
            status={status}
            onChange={setStatus}
          />
        </div>
      </div>
      <div className="form-grid">
        <label>
          Comienzo
          <input
            type="date"
            name="startedOn"
            defaultValue={run?.startedOn ?? today}
            required
          />
        </label>
        {status === "completado" && (
          <label>
            Finalización
            <input
              name="completedOn"
              type="date"
              defaultValue={run?.completedOn ?? today}
              required
            />
          </label>
        )}
      </div>
      <label>
        Dónde lo dejé <small>Nota privada de esta partida</small>
        <textarea
          name="whereLeft"
          rows={3}
          maxLength={5000}
          defaultValue={run?.whereLeft}
          placeholder="El siguiente paso, una misión, algo por explorar…"
        />
      </label>
      <div className="rating-field">
        <span className="rating-label">Valoración de esta partida</span>
        <RatingInput
          name="runRating"
          label="Valoración de esta partida"
          defaultValue={run?.rating}
        />
      </div>
      <details className="run-more">
        <summary>Más detalles: reseña, tiempo y finalización</summary>
        <label>
          Grado de finalización
          <select
            name="completion"
            defaultValue={run?.completion ?? "sin especificar"}
          >
            {["sin especificar", "historia", "100%"].map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reseña de esta partida
          <textarea
            name="runReview"
            rows={4}
            maxLength={5000}
            defaultValue={run?.review}
            aria-describedby={"run-review-format-" + (run?.id ?? "new")}
          />
        </label>
        <p
          id={"run-review-format-" + (run?.id ?? "new")}
          className="field-hint"
        >
          {markdownHint}
        </p>
        <fieldset className="time-field">
          <legend>Tiempo de finalización, opcional</legend>
          <p>
            Introduce el total que indica el juego. No se calcula a partir del
            calendario.
          </p>
          <div className="form-grid">
            <label>
              Horas
              <input
                name="hours"
                type="number"
                min={0}
                max={10000}
                defaultValue={
                  run?.completionMinutes !== undefined
                    ? Math.floor(run.completionMinutes / 60)
                    : ""
                }
              />
            </label>
            <label>
              Minutos
              <input
                name="minutes"
                type="number"
                min={0}
                max={59}
                defaultValue={
                  run?.completionMinutes !== undefined
                    ? run.completionMinutes % 60
                    : ""
                }
              />
            </label>
          </div>
        </fieldset>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="primary"
            defaultChecked={!run || run.id === game.primaryRunId}
          />{" "}
          Usar como partida principal
        </label>
      </details>
      <FormError message={error} />
      <div className="form-actions">
        <Button disabled={pending}>
          <Check size={16} /> Guardar partida
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
export function ActivityForm({
  state,
  initial,
  gameId,
  date,
  execute,
  onClose,
}: {
  state: Library;
  initial?: Activity;
  gameId?: string;
  date: string;
  execute: Execute;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(
      initial?.gameId ?? gameId ?? state.games[0]?.id ?? "",
    ),
    [selectedDate, setSelectedDate] = useState(initial?.date ?? date),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const existing = state.activities.find(
      (a) => a.id === activityId(selected, selectedDate),
    ),
    activity = initial ?? existing;
  const [confirm, setConfirm] = useState(false);
  if (!state.games.length)
    return (
      <p className="info-note">
        Añade un juego a tu biblioteca antes de registrar actividad.
      </p>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await execute({
            type: "save-activity",
            ...(initial ? { previousId: initial.id } : {}),
            activity: {
              id: activityId(selected, selectedDate),
              gameId: selected,
              date: selectedDate,
              note: value(f, "note"),
              ...(value(f, "runId") ? { runId: value(f, "runId") } : {}),
            },
          });
          onClose();
        } catch (e) {
          setError(message(e));
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="form-grid">
        <label>
          Juego
          <select
            value={selected}
            disabled={!!initial}
            onChange={(e) => setSelected(e.target.value)}
          >
            {state.games.map((g) => (
              <option value={g.id} key={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Día
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            required
          />
        </label>
      </div>
      {existing && (
        <p className="info-note">
          Este juego ya tiene actividad ese día. Puedes editar su nota.
        </p>
      )}
      <label>
        Partida <small>Opcional</small>
        <select
          key={selected}
          name="runId"
          defaultValue={
            activity?.runId ??
            state.games.find((g) => g.id === selected)?.primaryRunId ??
            ""
          }
        >
          <option value="">Sin asociar a una partida</option>
          {state.runs
            .filter((r) => r.gameId === selected)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} · {r.platform}
              </option>
            ))}
        </select>
      </label>
      <label>
        Algo para recordar <small>Opcional · privado</small>
        <textarea
          key={activity?.id ?? "new"}
          name="note"
          rows={4}
          maxLength={1000}
          defaultValue={activity?.note ?? ""}
          placeholder="Hoy he descubierto…"
        />
      </label>
      <FormError message={error} />
      <div className="form-actions">
        <Button disabled={pending}>
          <Check size={16} />
          {activity ? "Guardar actividad" : "Registrar día"}
        </Button>
        {activity && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirm(!confirm)}
          >
            <Trash2 size={16} /> Eliminar
          </Button>
        )}
      </div>
      {confirm && activity && (
        <div className="danger-area">
          <p>¿Eliminar la actividad del {formatDate(activity.date)}?</p>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await execute({ type: "delete-activity", id: activity.id });
                onClose();
              } catch (e) {
                setError(message(e));
                setPending(false);
              }
            }}
          >
            Confirmar eliminación
          </Button>
        </div>
      )}
    </form>
  );
}
