import {
  identity,
  LIMITS,
  statuses,
  type Game,
  type Library,
  type Run,
  type Status,
} from "./model";

// Un juego candidato a importar desde CSV o Steam, antes de convertirlo.
export type ImportCandidate = {
  title: string;
  platforms: string[];
  stores: string[];
  status: Status;
  rating?: number;
  hours?: number;
  cover?: string;
};

// --- CSV -------------------------------------------------------------------

// Lector de CSV con comillas, separador "," o ";" y saltos de línea en campos.
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const separator =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === separator) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
const columns = {
  title: ["titulo", "title", "name", "nombre", "juego", "game"],
  platform: ["plataforma", "plataformas", "platform", "platforms", "consola"],
  store: ["tienda", "tiendas", "store", "stores"],
  status: ["estado", "status"],
  rating: ["nota", "valoracion", "rating", "score", "puntuacion"],
  hours: ["horas", "hours", "duracion", "duration", "tiempo"],
};
const statusAliases: Record<string, Status> = {
  pendiente: "pendiente",
  backlog: "pendiente",
  "por jugar": "pendiente",
  "want to play": "pendiente",
  jugando: "jugando",
  playing: "jugando",
  "en pausa": "en pausa",
  pausado: "en pausa",
  paused: "en pausa",
  "on hold": "en pausa",
  completado: "completado",
  terminado: "completado",
  completed: "completado",
  finished: "completado",
  beaten: "completado",
  abandonado: "abandonado",
  dropped: "abandonado",
  abandoned: "abandonado",
};
const list = (s = "") => [
  ...new Set(
    s
      .split(/[,/|]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];

export function candidatesFromCsv(text: string) {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("El archivo CSV está vacío.");
  const find = (names: string[]) =>
    header.findIndex((h) => names.includes(normalize(h)));
  const idx = Object.fromEntries(
    Object.entries(columns).map(([k, names]) => [k, find(names)]),
  ) as Record<keyof typeof columns, number>;
  if (idx.title < 0)
    throw new Error(
      "El CSV necesita una columna de título («Título», «Title» o «Nombre»).",
    );
  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "") : "");
  return rows
    .map((row): ImportCandidate | undefined => {
      const title = cell(row, idx.title).slice(0, 160);
      if (!title) return undefined;
      const rating = Number(cell(row, idx.rating).replace(",", "."));
      const hours = Number(cell(row, idx.hours).replace(",", "."));
      return {
        title,
        platforms: list(cell(row, idx.platform)).slice(0, 12).length
          ? list(cell(row, idx.platform)).slice(0, 12)
          : ["PC"],
        stores: list(cell(row, idx.store)).slice(0, 12),
        status: statusAliases[normalize(cell(row, idx.status))] ?? "pendiente",
        ...(rating >= 1 && rating <= 10
          ? { rating: Math.round(rating * 2) / 2 }
          : {}),
        ...(hours > 0 && hours <= 10000 ? { hours } : {}),
      };
    })
    .filter((c): c is ImportCandidate => !!c);
}

// --- Steam -----------------------------------------------------------------

export type SteamGame = { appid: number; name: string; minutes: number };

export function candidatesFromSteam(games: SteamGame[]): ImportCandidate[] {
  return games
    .filter((g) => Number.isSafeInteger(g.appid) && g.name)
    .map((g) => ({
      title: g.name.slice(0, 160),
      platforms: ["PC"],
      stores: ["Steam"],
      status: "pendiente" as const,
      cover:
        "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
        g.appid +
        "/library_600x900.jpg",
    }));
}

// --- Conversión ------------------------------------------------------------

export function importPlan(state: Library, candidates: ImportCandidate[]) {
  const known = new Set(state.games.map(identity));
  const seen = new Set<string>();
  const fresh: ImportCandidate[] = [],
    duplicates: string[] = [];
  for (const c of candidates) {
    const key =
      "manual:" + c.title.normalize("NFKC").trim().toLocaleLowerCase("es");
    const titleTaken = state.games.some(
      (g) => normalize(g.title) === normalize(c.title),
    );
    if (known.has(key) || titleTaken || seen.has(key)) duplicates.push(c.title);
    else {
      seen.add(key);
      fresh.push(c);
    }
  }
  const room = Math.max(0, LIMITS.games - state.games.length);
  return {
    fresh: fresh.slice(0, room),
    duplicates,
    overLimit: Math.max(0, fresh.length - room),
  };
}

export function libraryFromCandidates(
  state: Library,
  candidates: ImportCandidate[],
  now: string,
  today: string,
  newId: () => string,
): Library {
  const games: Game[] = [],
    runs: Run[] = [];
  for (const c of candidates) {
    const id = newId(),
      runId = newId();
    games.push({
      id,
      title: c.title,
      genres: [],
      platforms: c.platforms,
      stores: c.stores,
      favorite: false,
      next: false,
      review: "",
      spoilerNote: "",
      primaryRunId: runId,
      updatedAt: now,
      ...(c.rating ? { rating: c.rating } : {}),
      ...(c.hours ? { approximateHours: c.hours } : {}),
      ...(c.cover ? { cover: c.cover } : {}),
    });
    runs.push({
      id: runId,
      gameId: id,
      label: "Primera partida",
      platform: c.platforms[0],
      status: statuses.includes(c.status) ? c.status : "pendiente",
      completion: c.status === "completado" ? "historia" : "sin especificar",
      startedOn: today,
      ...(c.status === "completado" ? { completedOn: today } : {}),
      whereLeft: "",
    });
  }
  return {
    revision: 0,
    games,
    runs,
    activities: [],
    lists: [],
    sagas: [],
    profile: state.profile,
  };
}
