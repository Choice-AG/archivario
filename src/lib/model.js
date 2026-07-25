import { Gamepad2, BookOpen, Tv, Tv2, Film } from "lucide-react";

/* ============================================================
   DATA MODEL
   ------------------------------------------------------------
   Saga   { id, name, description, orderMode: 'chronological'|'release', infoBlocks: [{id,title,body}] }
   Item   {
     id, type: 'game'|'manga'|'anime'|'series'|'movie', title, cover, sagaId,
     status, score (0-10|null), tags: string[],
     platform, hours,                 // game only
     currentVolume, currentChapter,   // manga only
     season, currentEpisode,          // anime/series only
     startDate, endDate, releaseDate,
     chronoOrder, releaseOrder, priority, priorityLevel,
     arc,                              // etiqueta libre para agrupar en la línea temporal de la saga
     era,                              // etiqueta libre para el año/época mostrado en la línea temporal
     notes, createdAt, updatedAt
   }
   ============================================================ */

export const TYPE_CONFIG = {
  game: {
    label: "Videojuego",
    plural: "Videojuegos",
    icon: Gamepad2,
    statuses: [
      { v: "wishlist", l: "Wishlist", tone: "wishlist" },
      { v: "pendiente", l: "Pendiente", tone: "todo" },
      { v: "jugando", l: "Jugando", tone: "active" },
      { v: "completado", l: "Completado", tone: "done" },
      { v: "platinado", l: "Platinado", tone: "mastered" },
      { v: "abandonado", l: "Abandonado", tone: "dropped" },
    ],
    done: ["completado", "platinado"],
    extraFields: [
      {
        key: "platform",
        label: "Plataforma",
        type: "text",
        placeholder: "PS5, Switch, PC...",
      },
      {
        key: "hours",
        label: "Horas jugadas",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  manga: {
    label: "Manga",
    plural: "Mangas",
    icon: BookOpen,
    statuses: [
      { v: "pendiente", l: "Pendiente", tone: "todo" },
      { v: "leyendo", l: "Leyendo", tone: "active" },
      { v: "en_pausa", l: "En pausa", tone: "dropped" },
      { v: "completado", l: "Completado", tone: "done" },
    ],
    done: ["completado"],
    extraFields: [
      {
        key: "currentVolume",
        label: "Tomo actual",
        type: "number",
        placeholder: "0",
      },
      {
        key: "currentChapter",
        label: "Capítulo actual",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  anime: {
    label: "Anime",
    plural: "Animes",
    icon: Tv,
    statuses: [
      { v: "pendiente", l: "Pendiente", tone: "todo" },
      { v: "viendo", l: "Viendo", tone: "active" },
      { v: "en_pausa", l: "En pausa", tone: "dropped" },
      { v: "completado", l: "Completado", tone: "done" },
    ],
    done: ["completado"],
    extraFields: [
      {
        key: "season",
        label: "Temporada",
        type: "number",
        placeholder: "1",
      },
      {
        key: "currentEpisode",
        label: "Episodio actual",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  series: {
    label: "Serie",
    plural: "Series",
    icon: Tv2,
    statuses: [
      { v: "pendiente", l: "Pendiente", tone: "todo" },
      { v: "viendo", l: "Viendo", tone: "active" },
      { v: "en_pausa", l: "En pausa", tone: "dropped" },
      { v: "completado", l: "Completado", tone: "done" },
    ],
    done: ["completado"],
    extraFields: [
      {
        key: "season",
        label: "Temporada",
        type: "number",
        placeholder: "1",
      },
      {
        key: "currentEpisode",
        label: "Episodio actual",
        type: "number",
        placeholder: "0",
      },
    ],
  },
  movie: {
    label: "Película",
    plural: "Películas",
    icon: Film,
    statuses: [
      { v: "pendiente", l: "Pendiente", tone: "todo" },
      { v: "vista", l: "Vista", tone: "done" },
    ],
    done: ["vista"],
    extraFields: [],
  },
};

export const PRIORITY_LEVELS = [
  { v: "favorito_absoluto", l: "Favorito absoluto" },
  { v: "muy_importante", l: "Muy importante" },
  { v: "alta_prioridad", l: "Alta prioridad" },
  { v: "importante", l: "Importante" },
  { v: "normal", l: "Normal" },
  { v: "baja", l: "Baja" },
  { v: "muy_baja", l: "Muy baja" },
  { v: "curiosidad", l: "Curiosidad" },
  { v: "algun_dia", l: "Algún día" },
  { v: "sin_interes", l: "Sin interés" },
];
export const DEFAULT_PRIORITY = "normal";

export const TYPE_LIST = Object.keys(TYPE_CONFIG);
export const PENDING_STATUS = {
  game: "pendiente",
  manga: "pendiente",
  anime: "pendiente",
  series: "pendiente",
  movie: "pendiente",
};

export const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const isDone = (item) =>
  TYPE_CONFIG[item.type].done.includes(item.status);
export const statusMeta = (item) =>
  TYPE_CONFIG[item.type].statuses.find((s) => s.v === item.status) ||
  TYPE_CONFIG[item.type].statuses[0];
export const priorityMeta = (item) =>
  PRIORITY_LEVELS.find((p) => p.v === item.priorityLevel) ||
  PRIORITY_LEVELS.find((p) => p.v === DEFAULT_PRIORITY);
export const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
export const monthYear = (d) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
};
