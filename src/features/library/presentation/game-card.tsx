"use client";
import { StatusMenu } from "./status-menu";
import { Check, Gamepad2, Heart, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Game, Run } from "../domain/model";
import { formatHours, timeLabels, type TimeMode } from "../domain/daily";
import { Cover } from "./shared";
import { CriticScore } from "./critic-score";
import { Stars } from "./rating-input";

export function GameCard({
  game: g,
  run,
  hours,
  timeMode,
  showCritic,
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
  showCritic: boolean;
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
        {showCritic && g.critic && (
          <span className="card-critic">
            <CriticScore critic={g.critic} compact />
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
        {g.rating !== undefined && (
          <Stars value={g.rating} size={11} className="rating" />
        )}
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

// La misma información en una fila: para bibliotecas grandes.
export function GameRow({
  game: g,
  run,
  hours,
  showCritic,
  playedToday,
  busy,
  selecting,
  selected,
  onSelect,
  onOpen,
  onFavorite,
  onStatus,
  onToday,
}: Omit<Parameters<typeof GameCard>[0], "timeMode">) {
  return (
    <li className="game-row">
      {selecting && (
        <input
          type="checkbox"
          aria-label={"Seleccionar " + g.title}
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      )}
      <button
        className="game-row-cover cover-wrap"
        aria-label={"Abrir " + g.title}
        onClick={onOpen}
        tabIndex={-1}
      >
        <Cover game={g} />
      </button>
      <div className="game-row-main">
        <button className="game-title" onClick={onOpen}>
          {g.title}
        </button>
        <small>
          {[...g.platforms, ...(g.wishlist ? ["Lista de deseos"] : [])].join(
            " · ",
          )}
        </small>
      </div>
      <StatusMenu
        label={"Estado de " + g.title}
        status={run.status}
        disabled={busy}
        onChange={onStatus}
      />
      <span className="game-row-rating">
        {g.rating !== undefined ? (
          <Stars value={g.rating} size={11} className="rating" />
        ) : (
          <span className="muted">Sin valorar</span>
        )}
      </span>
      {showCritic && (
        <span className="game-row-critic">
          {g.critic && <CriticScore critic={g.critic} compact />}
        </span>
      )}
      <span className="game-row-hours">{formatHours(hours)}</span>
      <span className="game-row-actions">
        <button
          className={"favorite-button " + (g.favorite ? "is-favorite" : "")}
          aria-label={
            (g.favorite ? "Quitar de" : "Añadir a") + " favoritos: " + g.title
          }
          aria-pressed={g.favorite}
          onClick={onFavorite}
        >
          <Heart size={16} fill={g.favorite ? "currentColor" : "none"} />
        </button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          aria-label={
            (playedToday ? "Registrado hoy: " : "He jugado hoy: ") + g.title
          }
          onClick={onToday}
        >
          {playedToday ? <Check size={15} /> : <Plus size={15} />}
          <span className="game-row-today">Hoy</span>
        </Button>
      </span>
    </li>
  );
}
