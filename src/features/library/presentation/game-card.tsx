"use client";
import { StatusMenu } from "./status-menu";
import { Check, Gamepad2, Heart, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Game, Run } from "../domain/model";
import { formatHours, timeLabels, type TimeMode } from "../domain/daily";
import { Cover } from "./shared";

export function GameCard({
  game: g,
  run,
  hours,
  timeMode,
  playedToday,
  busy,
  selecting,
  selected,
  onSelect,
  onOpen,
  onFavorite,
  onStatus,
  onToday,
}: {
  game: Game;
  run: Run;
  hours: number | undefined;
  timeMode: TimeMode;
  playedToday: boolean;
  busy: boolean;
  selecting: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onOpen: () => void;
  onFavorite: () => void;
  onStatus: (status: Run["status"]) => void;
  onToday: () => void;
}) {
  return (
    <article className="game-card">
      {selecting && (
        <label className="checkbox-label card-select">
          <input
            type="checkbox"
            aria-label={"Seleccionar " + g.title}
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
          />
          Seleccionar
        </label>
      )}
      <div className="cover-wrap">
        <button
          className="cover-link"
          aria-label={"Abrir " + g.title}
          onClick={onOpen}
        >
          <Cover game={g} />
        </button>
        <button
          className={"favorite-button " + (g.favorite ? "is-favorite" : "")}
          aria-label={
            (g.favorite ? "Quitar de" : "Añadir a") + " favoritos: " + g.title
          }
          aria-pressed={g.favorite}
          onClick={onFavorite}
        >
          <Heart size={17} fill={g.favorite ? "currentColor" : "none"} />
        </button>
        {g.rating && (
          <span className="rating">
            {g.rating.toLocaleString("es")}
            <small>/10</small>
          </span>
        )}
        {g.next && (
          <span className="next-badge">
            <Sparkles size={12} /> Próximamente
          </span>
        )}
      </div>
      <div className="game-body">
        <button className="game-title" onClick={onOpen}>
          {g.title}
        </button>
        {g.wishlist && (
          <small className="wish-label">En tu lista de deseos</small>
        )}
        <p className="platform-line">
          <Gamepad2 size={14} />
          {g.platforms.join(" · ")}
          <span>·</span>
          {g.stores[0] ?? "Sin tienda"}
        </p>
        <div className="card-bottom">
          <StatusMenu
            label={"Estado de " + g.title}
            status={run.status}
            disabled={busy}
            onChange={onStatus}
          />
          <span className="game-genre">{g.genres[0]}</span>
        </div>
        {["jugando", "en pausa"].includes(run.status) && (
          <details className="resume-note">
            <summary>Retomar partida</summary>
            <p>
              {run.whereLeft ||
                "Añade una nota en Partidas para recordar dónde lo dejaste."}
            </p>
            <button className="text-link" onClick={onOpen}>
              Abrir partida
            </button>
          </details>
        )}
        <p className="card-time">
          {timeLabels[timeMode]}: {formatHours(hours)}
        </p>
        <Button
          variant="secondary"
          className="w-full today-button"
          disabled={busy}
          onClick={onToday}
        >
          {playedToday ? (
            <>
              <Check size={15} /> Registrado hoy
            </>
          ) : (
            <>
              <Plus size={15} /> He jugado hoy
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
