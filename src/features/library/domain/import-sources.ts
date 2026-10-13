import {
  identity,
  LIMITS,
  statuses,
  TAGS_MAX,
  type Format,
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
  wishlist?: boolean;
  favorite?: boolean;
  genres?: string[];
  tags?: string[];
  format?: Format;
  edition?: string;
  recommendedBy?: string;
  review?: string;
  // Fecha en que lo terminaste y tiempo que jugaste (en minutos).
  completedOn?: string;
  minutes?: number;
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
  store: ["tienda", "tiendas", "store", "stores", "storefront"],
  status: ["estado", "status"],
  rating: ["nota", "valoracion", "rating", "score", "puntuacion"],
  hours: ["horas", "hours", "duracion", "duration", "tiempo"],
  genres: ["generos", "genres", "genero", "genre"],
  tags: ["etiquetas", "tags", "etiqueta", "tag"],
  wishlist: ["lista de deseos", "wishlist", "wish list", "deseado"],
  favorite: ["favorito", "favorite", "favourite", "liked"],
  completed: ["completado el", "completed on", "finished", "date completed"],
  review: ["resena", "review", "review notes"],
  format: ["formato", "format", "ownership"],
  edition: ["edicion", "edition"],
  recommended: ["recomendado por", "me lo recomendo", "recommended by"],
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
  shelved: "en pausa",
  stalled: "en pausa",
  completado: "completado",
  terminado: "completado",
  completed: "completado",
  finished: "completado",
  beaten: "completado",
  // Backloggd: «Played» y sus variantes.
  played: "completado",
  mastered: "completado",
  retired: "completado",
  abandonado: "abandonado",
  dropped: "abandonado",
  abandoned: "abandonado",
};
// Estados que en realidad significan «aún no lo tengo».
const wishAliases = ["wishlist", "wish list", "deseado", "lista de deseos"];
const formatAliases: Record<string, Format> = {
  fisico: "físico",
  physical: "físico",
  digital: "digital",
  suscripcion: "suscripción",
  subscription: "suscripción",
  prestado: "prestado",
  borrowed: "prestado",
};
const yes = (s: string) =>
  ["si", "sí", "yes", "true", "x", "1", "✓", "✔"].includes(normalize(s));
const list = (s = "") => [
  ...new Set(
    s
      .split(/[,/|]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
// Un campo de lista solo si tiene algo (como mucho 12 elementos).
const some = <K extends string>(key: K, items: string[]) =>
  (items.length ? { [key]: items.slice(0, 12) } : {}) as Partial<
    Record<K, string[]>
  >;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s);
// HH:MM:SS (HowLongToBeat) o un número de horas.
function minutesOf(text: string) {
  const t = text.trim();
  const hms = t.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hms) return Number(hms[1]) * 60 + Number(hms[2]);
  const hours = Number(t.replace(",", "."));
  return hours > 0 ? Math.round(hours * 60) : 0;
}
// Notas de 1 a 10 en pasos de 0,5, venga la escala que venga.
function scaleRatings(values: number[]) {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  const max = Math.max(0, ...valid);
  const factor = max > 10 ? 0.1 : max > 0 && max <= 5 ? 2 : 1;
  return (v: number) => {
    if (!Number.isFinite(v) || v <= 0) return undefined;
    const r = Math.round(v * factor * 2) / 2;
    return r >= 1 && r <= 10 ? r : undefined;
  };
}
function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}
// Nombres de un campo JSON de Grouvee: {"PC": {...}} o [{"name": "PC"}].
function jsonNames(text: string) {
  const value = parseJson(text);
  if (Array.isArray(value))
    return value
      .map((v) => (typeof v === "string" ? v : (v as { name?: string })?.name))
      .filter((v): v is string => !!v);
  return value && typeof value === "object" ? Object.keys(value) : [];
}

export type CsvSource = "howlongtobeat" | "grouvee" | "generic";
export const csvSourceLabels: Record<CsvSource, string> = {
  howlongtobeat: "HowLongToBeat",
  grouvee: "Grouvee",
  generic: "CSV",
};
const clean = (title: string) => title.slice(0, 160);

// HowLongToBeat: una columna con marca por estado y tiempos en HH:MM:SS.
function fromHowLongToBeat(header: string[], rows: string[][]) {
  const at = (name: string) => header.findIndex((h) => normalize(h) === name);
  const all = (name: string) =>
    header.flatMap((h, i) => (normalize(h) === name ? [i] : []));
  const [doneFlag, doneDate] = all("completed");
  const i = {
    title: at("title"),
    platform: at("platform"),
    store: at("storefront"),
    playing: at("playing"),
    backlog: at("backlog"),
    replay: at("replay"),
    stalled: at("stalled"),
    blocked: at("blocked"),
    retired: at("retired"),
    progress: at("progress"),
    review: at("review"),
    notes: at("review notes"),
  };
  const cell = (row: string[], n: number | undefined) =>
    n !== undefined && n >= 0 ? (row[n] ?? "").trim() : "";
  const on = (row: string[], n: number | undefined) => {
    const v = cell(row, n);
    return !!v && v !== "--" && v !== "0";
  };
  const rating = scaleRatings(rows.map((r) => Number(cell(r, i.review))));
  return rows.flatMap((row): ImportCandidate[] => {
    const title = clean(cell(row, i.title));
    if (!title) return [];
    const finished = [doneDate, doneFlag].map((n) => cell(row, n)).find(isDate);
    const status: Status =
      on(row, doneFlag) || finished
        ? "completado"
        : on(row, i.retired)
          ? "abandonado"
          : on(row, i.playing) || on(row, i.replay)
            ? "jugando"
            : on(row, i.stalled) || on(row, i.blocked)
              ? "en pausa"
              : "pendiente";
    const minutes = minutesOf(cell(row, i.progress));
    const score = rating(Number(cell(row, i.review)));
    const platforms = list(cell(row, i.platform)).slice(0, 12);
    return [
      {
        title,
        platforms: platforms.length ? platforms : ["PC"],
        stores: list(cell(row, i.store)).slice(0, 12),
        status,
        ...(score ? { rating: score } : {}),
        ...(minutes ? { minutes } : {}),
        ...(finished ? { completedOn: finished.slice(0, 10) } : {}),
        ...(cell(row, i.notes) ? { review: cell(row, i.notes) } : {}),
      },
    ];
  });
}

// Grouvee: estanterías, plataformas y fechas en JSON; nota de 1 a 5.
const grouveeShelves: Record<string, Status> = {
  played: "completado",
  playing: "jugando",
  backlog: "pendiente",
};
function fromGrouvee(header: string[], rows: string[][]) {
  const at = (name: string) => header.findIndex((h) => normalize(h) === name);
  const i = {
    title: at("name"),
    shelves: at("shelves"),
    platforms: at("platforms"),
    rating: at("rating"),
    review: at("review"),
    dates: at("dates"),
    genres: at("genres"),
  };
  const cell = (row: string[], n: number) => (n >= 0 ? (row[n] ?? "") : "");
  return rows.flatMap((row): ImportCandidate[] => {
    const title = clean(cell(row, i.title).trim());
    if (!title) return [];
    const shelves = jsonNames(cell(row, i.shelves));
    const known = shelves.map((s) => normalize(s));
    const wishlist = known.includes("wish list") || known.includes("wishlist");
    const status =
      (["played", "playing", "backlog"] as const)
        .filter((s) => known.includes(s))
        .map((s) => grouveeShelves[s])[0] ?? "pendiente";
    // Las estanterías propias se convierten en etiquetas.
    const tags = shelves
      .filter(
        (s) =>
          !["played", "playing", "backlog", "wish list", "wishlist"].includes(
            normalize(s),
          ),
      )
      .map((s) => s.slice(0, 40))
      .slice(0, TAGS_MAX);
    const dates = parseJson(cell(row, i.dates));
    const plays = Array.isArray(dates)
      ? (dates as { date_finished?: string; seconds_played?: number }[])
      : [];
    const finished = plays
      .map((d) => d?.date_finished ?? "")
      .filter(isDate)
      .sort()
      .pop();
    const seconds = plays.reduce(
      (sum, d) => sum + (Number(d?.seconds_played) || 0),
      0,
    );
    const stars = Number(cell(row, i.rating));
    const platforms = jsonNames(cell(row, i.platforms))
      .map((p) => p.slice(0, 60))
      .slice(0, 12);
    const review = cell(row, i.review).trim();
    return [
      {
        title,
        platforms: platforms.length ? platforms : ["PC"],
        stores: [],
        status: wishlist && status === "pendiente" ? "pendiente" : status,
        ...(wishlist && status === "pendiente" ? { wishlist: true } : {}),
        ...(stars >= 1 && stars <= 5 ? { rating: stars * 2 } : {}),
        ...(seconds >= 60 ? { minutes: Math.round(seconds / 60) } : {}),
        ...(finished ? { completedOn: finished.slice(0, 10) } : {}),
        ...(review && review !== "null" ? { review } : {}),
        ...(tags.length ? { tags } : {}),
        ...some(
          "genres",
          jsonNames(cell(row, i.genres)).map((g) => g.slice(0, 60)),
        ),
      },
    ];
  });
}

// Cualquier otro CSV (el de Archivario, una hoja de cálculo, Backloggd…).
function fromGeneric(header: string[], rows: string[][]) {
  const find = (names: string[]) =>
    header.findIndex((h) => names.includes(normalize(h)));
  const idx = Object.fromEntries(
    Object.entries(columns).map(([k, names]) => [k, find(names)]),
  ) as Record<keyof typeof columns, number>;
  if (idx.title < 0)
    throw new Error(
      "El CSV necesita una columna de título («Título», «Title» o «Nombre»).",
    );
  // Quita el apóstrofo que añade la exportación ante fórmulas (='…).
  const cell = (row: string[], i: number) =>
    (i >= 0 ? (row[i] ?? "") : "").replace(/^'(?=[=+\-@])/, "");
  const rating = scaleRatings(
    rows.map((r) => Number(cell(r, idx.rating).replace(",", "."))),
  );
  return rows.flatMap((row): ImportCandidate[] => {
    const title = clean(cell(row, idx.title));
    if (!title) return [];
    const statusText = normalize(cell(row, idx.status));
    const wishlist =
      wishAliases.includes(statusText) || yes(cell(row, idx.wishlist));
    const score = rating(Number(cell(row, idx.rating).replace(",", ".")));
    const hours = Number(cell(row, idx.hours).replace(",", "."));
    const platforms = list(cell(row, idx.platform)).slice(0, 12);
    const status: Status = wishlist
      ? "pendiente"
      : (statusAliases[statusText] ?? "pendiente");
    const finished = cell(row, idx.completed).trim();
    const format = formatAliases[normalize(cell(row, idx.format))];
    const tags = list(cell(row, idx.tags))
      .map((t) => t.slice(0, 40))
      .slice(0, TAGS_MAX);
    const edition = cell(row, idx.edition).trim().slice(0, 80),
      recommendedBy = cell(row, idx.recommended).trim().slice(0, 80),
      review = cell(row, idx.review).trim().slice(0, 5000);
    return [
      {
        title,
        platforms: platforms.length ? platforms : ["PC"],
        stores: list(cell(row, idx.store)).slice(0, 12),
        status,
        ...(wishlist ? { wishlist: true } : {}),
        ...(score ? { rating: score } : {}),
        ...(hours > 0 && hours <= 10000 ? { hours } : {}),
        ...(status === "completado" && isDate(finished)
          ? { completedOn: finished.slice(0, 10) }
          : {}),
        ...(yes(cell(row, idx.favorite)) ? { favorite: true } : {}),
        ...(format && !wishlist ? { format } : {}),
        ...(edition && !wishlist ? { edition } : {}),
        ...(tags.length ? { tags } : {}),
        ...(recommendedBy ? { recommendedBy } : {}),
        ...(review ? { review } : {}),
        ...some(
          "genres",
          list(cell(row, idx.genres)).map((g) => g.slice(0, 60)),
        ),
      },
    ];
  });
}

export function readCsv(text: string): {
  source: CsvSource;
  candidates: ImportCandidate[];
} {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("El archivo CSV está vacío.");
  const names = new Set(header.map(normalize));
  if (["title", "playing", "backlog", "retired"].every((n) => names.has(n)))
    return {
      source: "howlongtobeat",
      candidates: fromHowLongToBeat(header, rows),
    };
  if (names.has("name") && names.has("shelves"))
    return { source: "grouvee", candidates: fromGrouvee(header, rows) };
  return { source: "generic", candidates: fromGeneric(header, rows) };
}

export function candidatesFromCsv(text: string) {
  return readCsv(text).candidates;
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
    const status = statuses.includes(c.status) ? c.status : "pendiente";
    const done = status === "completado";
    // Una fecha de fin pasada se respeta; la partida empieza ese mismo día.
    const finished =
      done && c.completedOn && c.completedOn <= today ? c.completedOn : today;
    games.push({
      id,
      title: c.title,
      genres: c.genres ?? [],
      platforms: c.platforms,
      stores: c.stores,
      favorite: !!c.favorite,
      next: false,
      review: c.review ?? "",
      spoilerNote: "",
      primaryRunId: runId,
      updatedAt: now,
      ...(c.rating ? { rating: c.rating } : {}),
      ...(c.hours ? { approximateHours: c.hours } : {}),
      ...(c.cover ? { cover: c.cover } : {}),
      ...(c.wishlist ? { wishlist: true } : {}),
      ...(c.tags?.length ? { tags: c.tags } : {}),
      ...(c.format ? { format: c.format } : {}),
      ...(c.edition ? { edition: c.edition } : {}),
      ...(c.recommendedBy ? { recommendedBy: c.recommendedBy } : {}),
    });
    runs.push({
      id: runId,
      gameId: id,
      label: "Primera partida",
      platform: c.platforms[0],
      status,
      completion: done ? "historia" : "sin especificar",
      startedOn: done ? finished : today,
      ...(done ? { completedOn: finished } : {}),
      ...(done && c.minutes ? { completionMinutes: c.minutes } : {}),
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

// --- Exportación ---------------------------------------------------------

// Celda CSV con comillas cuando hace falta. Las que empiezan por = + - @ se
// prefijan con un apóstrofo para que una hoja de cálculo no las ejecute.
function csvCell(value: string | number | undefined) {
  let text = value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[";\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

// CSV compatible con la importación (separador «;» para Excel en español).
export function libraryToCsv(state: Library) {
  const header = [
    "Título",
    "Plataforma",
    "Tienda",
    "Estado",
    "Nota",
    "Horas",
    "Géneros",
    "Favorito",
    "Lista de deseos",
    "Completado el",
    "Reseña",
    "Etiquetas",
    "Formato",
    "Edición",
    "Recomendado por",
  ];
  const rows = state.games.map((g) => {
    const run = state.runs.find((r) => r.id === g.primaryRunId);
    return [
      g.title,
      g.platforms.join(", "),
      g.stores.join(", "),
      run?.status ?? "",
      g.rating?.toString().replace(".", ","),
      (g.times?.main?.hours ?? g.approximateHours)
        ?.toString()
        .replace(".", ","),
      g.genres.join(", "),
      g.favorite ? "sí" : "",
      g.wishlist ? "sí" : "",
      run?.completedOn ?? "",
      g.review,
      (g.tags ?? []).join(", "),
      g.format ?? "",
      g.edition ?? "",
      g.recommendedBy ?? "",
    ];
  });
  return (
    "\uFEFF" +
    [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n") +
    "\r\n"
  );
}
