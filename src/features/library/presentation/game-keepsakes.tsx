"use client";
import { useState } from "react";
import { Plus, Quote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EXTRAS_MAX,
  MOMENTS_MAX,
  type Command,
  type Game,
} from "../domain/model";
import { DateText } from "./format";

type Mutate = (command: Command) => Promise<boolean>;

// Sin la lista vacía: el campo desaparece del juego.
function withList<K extends "moments" | "extras">(
  game: Game,
  key: K,
  list: NonNullable<Game[K]>,
): Game {
  const rest = { ...game };
  delete rest[key];
  return list.length ? { ...rest, [key]: list } : rest;
}

// Frases, escenas o instantes del juego que quieres conservar.
export function Moments({
  game,
  today,
  busy,
  mutate,
}: {
  game: Game;
  today: string;
  busy: boolean;
  mutate: Mutate;
}) {
  const [draft, setDraft] = useState<string>();
  const moments = game.moments ?? [];
  const save = (list: NonNullable<Game["moments"]>) =>
    mutate({ type: "save-game", game: withList(game, "moments", list) });
  return (
    <section className="game-section" id="game-moments">
      <div className="section-header">
        <h2>Momentos</h2>
        {draft === undefined && moments.length < MOMENTS_MAX && (
          <button className="text-link" onClick={() => setDraft("")}>
            <Plus size={13} /> Guardar un momento
          </button>
        )}
      </div>
      {draft !== undefined && (
        <form
          className="where-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await save([
                ...moments,
                { id: crypto.randomUUID(), text: draft.trim(), date: today },
              ])
            )
              setDraft(undefined);
          }}
        >
          <label>
            <span className="sr-only">Nuevo momento</span>
            <textarea
              autoFocus
              required
              rows={2}
              maxLength={500}
              value={draft}
              placeholder="Una frase, una escena, algo que no quieres olvidar"
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <Button size="sm" disabled={busy || !draft.trim()}>
              Guardar momento
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => setDraft(undefined)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {moments.length ? (
        <ul className="moment-list">
          {[...moments].reverse().map((m) => (
            <li key={m.id}>
              <Quote size={15} aria-hidden="true" />
              <p>
                {m.text}
                {m.date && (
                  <small>
                    <DateText date={m.date} />
                  </small>
                )}
              </p>
              <button
                aria-label={"Quitar el momento: " + m.text.slice(0, 60)}
                disabled={busy}
                onClick={() => save(moments.filter((x) => x.id !== m.id))}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        draft === undefined && (
          <p className="muted">
            Guarda aquí frases o escenas del juego. Solo las ves tú, y se reúnen
            en tu perfil.
          </p>
        )
      )}
    </section>
  );
}

// DLC y expansiones dentro de la ficha del juego base.
export function Extras({
  game,
  busy,
  mutate,
}: {
  game: Game;
  busy: boolean;
  mutate: Mutate;
}) {
  const [title, setTitle] = useState("");
  const extras = game.extras ?? [];
  const save = (list: NonNullable<Game["extras"]>) =>
    mutate({ type: "save-game", game: withList(game, "extras", list) });
  const done = extras.filter((e) => e.done).length;
  return (
    <section className="game-section" id="game-extras">
      <div className="section-header">
        <h2>Contenido adicional</h2>
        {extras.length > 0 && (
          <span className="muted text-sm">
            {done} de {extras.length} jugados
          </span>
        )}
      </div>
      <p className="muted text-sm">
        DLC y expansiones de este juego, sin añadirlos como juegos sueltos.
      </p>
      {extras.length > 0 && (
        <ul className="extras-list">
          {extras.map((x) => (
            <li key={x.id}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={x.done}
                  disabled={busy}
                  onChange={(e) =>
                    save(
                      extras.map((y) =>
                        y.id === x.id ? { ...y, done: e.target.checked } : y,
                      ),
                    )
                  }
                />{" "}
                {x.title}
              </label>
              <button
                aria-label={"Quitar " + x.title}
                disabled={busy}
                onClick={() => save(extras.filter((y) => y.id !== x.id))}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {extras.length < EXTRAS_MAX && (
        <form
          className="extras-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await save([
                ...extras,
                { id: crypto.randomUUID(), title: title.trim(), done: false },
              ])
            )
              setTitle("");
          }}
        >
          <label>
            <span className="sr-only">Nombre del DLC o la expansión</span>
            <input
              value={title}
              maxLength={160}
              placeholder="Nombre del DLC o la expansión"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <Button variant="secondary" disabled={busy || !title.trim()}>
            <Plus size={15} /> Añadir
          </Button>
        </form>
      )}
    </section>
  );
}
