export const statuses = [
  "pendiente",
  "jugando",
  "en pausa",
  "completado",
  "abandonado",
] as const;
export type Status = (typeof statuses)[number];
export type Completion = "sin especificar" | "historia" | "100%";
export type TimeEstimate = { hours: number; source: "IGDB" | "manual" };
export type GameTimes = {
  main?: TimeEstimate;
  extras?: TimeEstimate;
  complete?: TimeEstimate;
};
export type Game = {
  times?: GameTimes;
  id: string;
  title: string;
  catalogId?: number;
  cover?: string;
  genres: string[];
  approximateHours?: number;
  platforms: string[];
  stores: string[];
  wishlist?: boolean;
  favorite: boolean;
  next: boolean;
  rating?: number;
  review: string;
  spoilerNote: string;
  primaryRunId: string;
  updatedAt: string;
};
export type Run = {
  id: string;
  gameId: string;
  label: string;
  platform: string;
  status: Status;
  completion: Completion;
  startedOn: string;
  completedOn?: string;
  whereLeft: string;
  rating?: number;
  review?: string;
  completionMinutes?: number;
};
export type Activity = {
  id: string;
  gameId: string;
  date: string;
  runId?: string;
  note: string;
};
export type Profile = {
  name: string;
  bio: string;
  timezone: string;
  avatarVersion?: string;
};
export type GameList = {
  id: string;
  name: string;
  description: string;
  gameIds: string[];
};
export type SagaEntry = {
  alternatives?: { catalogId: number; title: string }[];
  catalogId?: number;
  gameId?: string;
  title: string;
  cover?: string;
  releaseDate: string;
  chapter: string;
  note: string;
  optional: boolean;
};
export type Saga = {
  id: string;
  name: string;
  description: string;
  order: "release" | "story" | "recommended";
  source: string;
  entries: SagaEntry[];
};
export type Library = {
  sagas?: Saga[];
  lists?: GameList[];
  revision: number;
  games: Game[];
  runs: Run[];
  activities: Activity[];
  profile: Profile;
};
export type Backup = {
  version: 1;
  exportedAt: string;
  data: Library;
};
export type Command =
  | { type: "batch-status"; gameIds: string[]; status: Status; date: string }
  | { type: "batch-list"; gameIds: string[]; listId: string }
  | {
      type: "save-day";
      date: string;
      items: { gameId: string; runId: string; note: string }[];
    }
  | { type: "save-saga"; saga: Saga }
  | { type: "delete-saga"; id: string }
  | {
      type: "add-activities";
      gameId: string;
      runId: string;
      dates: string[];
      note: string;
    }
  | { type: "save-list"; list: GameList }
  | { type: "delete-list"; id: string }
  | { type: "save-game"; game: Game; run?: Run }
  | { type: "delete-game"; id: string }
  | { type: "save-run"; run: Run; primary: boolean }
  | { type: "save-activity"; activity: Activity; previousId?: string }
  | { type: "delete-activity"; id: string }
  | { type: "profile"; profile: Profile }
  | { type: "import"; data: Library; policy: "skip" | "replace" };
export class DomainError extends Error {}
export function emptyLibrary(): Library {
  return {
    revision: 0,
    games: [],
    runs: [],
    activities: [],
    profile: { name: "", bio: "", timezone: "Europe/Madrid" },
  };
}
export function dateInZone(now: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
export function activityId(gameId: string, date: string) {
  return gameId + "_" + date;
}
export function identity(g: Game) {
  return g.catalogId
    ? "igdb:" + g.catalogId
    : "manual:" + g.title.normalize("NFKC").trim().toLocaleLowerCase("es");
}
export function monthlySummary(state: Library, month: string) {
  const activity = state.activities.filter((a) => a.date.startsWith(month));
  return {
    games: new Set(activity.map((a) => a.gameId)).size,
    days: new Set(activity.map((a) => a.date)).size,
    completed: state.runs.filter(
      (r) => r.status === "completado" && r.completedOn?.startsWith(month),
    ).length,
  };
}
export function assertLibrary(s: Library) {
  const unique = (xs: string[]) => new Set(xs).size === xs.length;
  if (
    !unique(s.games.map((g) => g.id)) ||
    !unique(s.games.map(identity)) ||
    !unique(s.runs.map((r) => r.id)) ||
    !unique(s.activities.map((a) => a.id))
  )
    throw new DomainError("Hay identificadores o juegos duplicados.");
  if (s.games.filter((g) => g.next).length > 3)
    throw new DomainError("Puedes elegir hasta tres próximos juegos.");
  if ((s.sagas?.length ?? 0) > 30 || !unique((s.sagas ?? []).map((x) => x.id)))
    throw new DomainError("Máximo 30 sagas, sin duplicados.");
  for (const saga of s.sagas ?? [])
    if (
      !saga.name.trim() ||
      saga.entries.length > 100 ||
      !unique(
        saga.entries.map((e) =>
          e.catalogId ? "igdb:" + e.catalogId : (e.gameId ?? e.title),
        ),
      )
    )
      throw new DomainError(
        "La saga contiene juegos duplicados o demasiados títulos.",
      );
  if ((s.lists?.length ?? 0) > 50 || !unique((s.lists ?? []).map((l) => l.id)))
    throw new DomainError("Máximo 50 listas, sin identificadores duplicados.");
  for (const l of s.lists ?? [])
    if (
      !l.name.trim() ||
      l.name.length > 80 ||
      l.description.length > 1000 ||
      !unique(l.gameIds) ||
      l.gameIds.some((id) => !s.games.some((g) => g.id === id))
    )
      throw new DomainError("La lista contiene datos o juegos no válidos.");
  for (const g of s.games) {
    if (!s.runs.some((r) => r.id === g.primaryRunId && r.gameId === g.id))
      throw new DomainError(
        "Cada juego necesita una partida principal propia.",
      );
    if (
      g.rating !== undefined &&
      (g.rating < 1 || g.rating > 10 || (g.rating * 2) % 1 !== 0)
    )
      throw new DomainError(
        "La valoración debe estar entre 1 y 10, en pasos de 0,5.",
      );
  }
  for (const r of s.runs) {
    if (
      r.rating !== undefined &&
      (r.rating < 1 || r.rating > 10 || (r.rating * 2) % 1 !== 0)
    )
      throw new DomainError(
        "La valoración debe estar entre 1 y 10, en pasos de 0,5.",
      );
    if ((r.review?.length ?? 0) > 5000)
      throw new DomainError("La reseña es demasiado larga.");
    if (!s.games.some((g) => g.id === r.gameId))
      throw new DomainError("La partida no pertenece a tu biblioteca.");
    if (r.status === "completado" && !r.completedOn)
      throw new DomainError("Indica la fecha de finalización.");
    if (r.status !== "completado" && r.completedOn)
      throw new DomainError(
        "Solo una partida completada tiene fecha de finalización.",
      );
    if (r.completedOn && r.completedOn < r.startedOn)
      throw new DomainError(
        "La finalización no puede ser anterior al comienzo.",
      );
  }
  for (const a of s.activities) {
    if (
      a.id !== activityId(a.gameId, a.date) ||
      !s.games.some((g) => g.id === a.gameId) ||
      (a.runId &&
        !s.runs.some((r) => r.id === a.runId && r.gameId === a.gameId))
    )
      throw new DomainError(
        "La actividad debe pertenecer al juego y a su partida.",
      );
  }
  if (
    s.games.length > 200 ||
    s.runs.length > 600 ||
    s.activities.length > 3000 ||
    new TextEncoder().encode(JSON.stringify(s)).length > 450000
  )
    throw new DomainError(
      "Se ha alcanzado el límite de esta primera versión. Exporta tu biblioteca.",
    );
}
export function importPreview(current: Library, incoming: Library) {
  const duplicates = incoming.games.filter((g) =>
    current.games.some((e) => identity(e) === identity(g)),
  );
  return {
    newGames: incoming.games.length - duplicates.length,
    duplicates: duplicates.map((g) => g.title),
    activities: incoming.activities.length,
  };
}
export function applyCommand(
  current: Library,
  command: Command,
  now: string,
): Library {
  const s = structuredClone(current);
  const touch = (id: string) => {
    const g = s.games.find((g) => g.id === id);
    if (!g) throw new DomainError("Juego no encontrado.");
    g.updatedAt = now;
  };
  switch (command.type) {
    case "batch-status": {
      for (const id of new Set(command.gameIds)) {
        touch(id);
        const g = s.games.find((g) => g.id === id)!;
        const r = s.runs.find((r) => r.id === g.primaryRunId)!;
        r.status = command.status;
        if (command.status === "completado") r.completedOn = command.date;
        else delete r.completedOn;
      }
      break;
    }
    case "batch-list": {
      const list = s.lists?.find((l) => l.id === command.listId);
      if (!list) throw new DomainError("Lista no encontrada.");
      for (const id of new Set(command.gameIds)) {
        touch(id);
        if (!list.gameIds.includes(id)) list.gameIds.push(id);
      }
      break;
    }
    case "save-day": {
      for (const item of command.items) {
        touch(item.gameId);
        if (
          !s.runs.some((r) => r.id === item.runId && r.gameId === item.gameId)
        )
          throw new DomainError("La partida no pertenece al juego.");
        const id = activityId(item.gameId, command.date);
        s.activities = s.activities.filter((a) => a.id !== id);
        s.activities.push({ id, date: command.date, ...item });
      }
      break;
    }
    case "save-saga":
      s.sagas = [
        ...(s.sagas ?? []).filter((x) => x.id !== command.saga.id),
        command.saga,
      ];
      break;
    case "delete-saga":
      s.sagas = (s.sagas ?? []).filter((x) => x.id !== command.id);
      break;
    case "add-activities": {
      touch(command.gameId);
      if (
        !s.runs.some(
          (r) => r.id === command.runId && r.gameId === command.gameId,
        )
      )
        throw new DomainError("La partida no pertenece al juego.");
      if (command.dates.length < 1 || command.dates.length > 62)
        throw new DomainError("Selecciona entre 1 y 62 días.");
      for (const date of new Set(command.dates)) {
        const parsed = new Date(date + "T12:00:00Z");
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          isNaN(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== date
        )
          throw new DomainError("Fecha no válida.");
        const id = activityId(command.gameId, date);
        if (!s.activities.some((a) => a.id === id))
          s.activities.push({
            id,
            gameId: command.gameId,
            runId: command.runId,
            date,
            note: command.note,
          });
      }
      break;
    }
    case "save-list": {
      const lists = s.lists ?? [];
      const index = lists.findIndex((l) => l.id === command.list.id);
      if (index < 0) lists.push(command.list);
      else lists[index] = command.list;
      s.lists = lists;
      break;
    }
    case "delete-list":
      s.lists = (s.lists ?? []).filter((l) => l.id !== command.id);
      break;
    case "save-game": {
      const idx = s.games.findIndex((g) => g.id === command.game.id);
      if (idx < 0) {
        if (
          !command.run ||
          command.run.gameId !== command.game.id ||
          s.runs.some((r) => r.id === command.run!.id)
        )
          throw new DomainError("Falta una nueva partida válida.");
        s.games.push(command.game);
        s.runs.push(command.run);
      } else {
        if (command.run)
          throw new DomainError("Edita la partida por separado.");
        s.games[idx] = command.game;
      }
      touch(command.game.id);
      break;
    }
    case "delete-game":
      touch(command.id);
      s.games = s.games.filter((g) => g.id !== command.id);
      s.lists =
        s.lists?.map((l) => ({
          ...l,
          gameIds: l.gameIds.filter((id) => id !== command.id),
        })) ?? [];
      s.runs = s.runs.filter((r) => r.gameId !== command.id);
      s.activities = s.activities.filter((a) => a.gameId !== command.id);
      break;
    case "save-run": {
      touch(command.run.gameId);
      const old = s.runs.find((r) => r.id === command.run.id);
      if (old && old.gameId !== command.run.gameId)
        throw new DomainError("No puedes mover partidas entre juegos.");
      s.runs = s.runs.filter((r) => r.id !== command.run.id);
      s.runs.push(command.run);
      if (command.primary)
        s.games.find((g) => g.id === command.run.gameId)!.primaryRunId =
          command.run.id;
      break;
    }
    case "save-activity": {
      touch(command.activity.gameId);
      if (command.previousId) {
        const old = s.activities.find((a) => a.id === command.previousId);
        if (!old || old.gameId !== command.activity.gameId)
          throw new DomainError("Actividad original no válida.");
        if (
          command.previousId !== command.activity.id &&
          s.activities.some((a) => a.id === command.activity.id)
        )
          throw new DomainError(
            "Ya hay actividad ese día. Edita ese registro o elige otra fecha.",
          );
        s.activities = s.activities.filter((a) => a.id !== command.previousId);
      }
      const a = {
        ...command.activity,
        id: activityId(command.activity.gameId, command.activity.date),
      };
      s.activities = s.activities.filter((old) => old.id !== a.id);
      s.activities.push(a);
      break;
    }
    case "delete-activity": {
      const a = s.activities.find((a) => a.id === command.id);
      if (!a) throw new DomainError("Actividad no encontrada.");
      touch(a.gameId);
      s.activities = s.activities.filter((a) => a.id !== command.id);
      break;
    }
    case "profile":
      s.profile = command.profile;
      break;
    case "import": {
      assertLibrary(command.data);
      if (command.policy === "replace") {
        s.games = command.data.games;
        s.runs = command.data.runs;
        s.activities = command.data.activities;
        s.profile = command.data.profile;
        s.lists = command.data.lists ?? [];
        s.sagas = command.data.sagas ?? [];
      } else {
        for (const game of command.data.games) {
          if (s.games.some((g) => identity(g) === identity(game))) continue;
          if (s.games.some((g) => g.id === game.id))
            throw new DomainError("Un identificador coincide con otro juego.");
          s.games.push({ ...game, next: false });
          s.runs.push(...command.data.runs.filter((r) => r.gameId === game.id));
          s.activities.push(
            ...command.data.activities.filter((a) => a.gameId === game.id),
          );
        }
        const mapping = new Map(
          command.data.games.map((g) => [
            g.id,
            s.games.find((x) => identity(x) === identity(g))!.id,
          ]),
        );
        s.sagas = [
          ...(s.sagas ?? []),
          ...(command.data.sagas ?? [])
            .filter((x) => !(s.sagas ?? []).some((y) => y.id === x.id))
            .map((saga) => ({
              ...saga,
              entries: saga.entries.map((e) =>
                e.gameId
                  ? { ...e, gameId: mapping.get(e.gameId) ?? e.gameId }
                  : e,
              ),
            })),
        ];
        for (const list of command.data.lists ?? []) {
          if ((s.lists ?? []).some((l) => l.id === list.id)) continue;
          s.lists = [
            ...(s.lists ?? []),
            {
              ...list,
              gameIds: [...new Set(list.gameIds.map((id) => mapping.get(id)!))],
            },
          ];
        }
      }
      break;
    }
  }
  s.revision = current.revision + 1;
  assertLibrary(s);
  return s;
}
