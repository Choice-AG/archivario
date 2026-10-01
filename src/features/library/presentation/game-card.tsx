"use client";
import { StatusMenu } from "./status-menu";
import { Check, Heart, Plus, Sparkles } from "lucide-react";
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
  // Tarjeta compacta: la portada manda y lo demás cabe en dos líneas, para ver
  // muchos juegos de un vistazo (hasta ocho por fila).
  return (
    <article className="game-card">
      <div className="cover-wrap">
        <button
          className="cover-link"
          aria-label={"Abrir " + g.title}
          onClick={onOpen}
        >
          <Cover game={g} />
        </button>
        {selecting && (
          <label className="card-select">
            <input
              type="checkbox"
              aria-label={"Seleccionar " + g.title}
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
            />
          </label>
        )}
        <button
          className={"favorite-button " + (g.favorite ? "is-favorite" : "")}
          aria-label={
            (g.favorite ? "Quitar de" : "Añadir a") + " favoritos: " + g.title
          }
          aria-pressed={g.favorite}
          onClick={onFavorite}
        >
          <Heart size={14} fill={g.favorite ? "currentColor" : "none"} />
        </button>
        {g.next && (
          <span className="next-badge" title="Próximamente">
            <Sparkles size={12} />
            <span className="sr-only">Próximamente</span>
          </span>
        )}
        {showCritic && g.critic && (
          <span className="card-critic">
            <CriticScore critic={g.critic} compact />
          </span>
        )}
      </div>
      <div className="game-body">
        <button className="game-title" onClick={onOpen} title={g.title}>
          {g.title}
        </button>
        <p className="platform-line">
          <span>{g.platforms[0] ?? "Sin plataforma"}</span>
          {hours !== undefined && (
            <span title={timeLabels[timeMode]}>{formatHours(hours)}</span>
          )}
          {g.wishlist && <span className="wish-label">Deseado</span>}
        </p>
        {g.rating !== undefined && (
          <Stars value={g.rating} size={9} className="rating" />
        )}
        <div className="card-bottom">
          <StatusMenu
            label={"Estado de " + g.title}
            status={run.status}
            disabled={busy}
            onChange={onStatus}
          />
          <button
            type="button"
            className={"today-button " + (playedToday ? "is-today" : "")}
            disabled={busy}
            aria-label={playedToday ? "Registrado hoy" : "He jugado hoy"}
            title={playedToday ? "Registrado hoy" : "He jugado hoy"}
            onClick={onToday}
          >
            {playedToday ? <Check size={14} /> : <Plus size={14} />}
          </button>
        </div>
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
