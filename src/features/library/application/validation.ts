import { z } from "zod";
import {
  activityId,
  assertLibrary,
  LIMITS,
  statuses,
  type Activity,
  type Game,
  type GameList,
  type Profile,
  type Run,
  type Saga,
} from "../domain/model";
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Fecha no válida");
const text = (max: number) => z.string().max(max);
const timeEstimate = z
  .object({
    hours: z.number().min(0).max(10000),
    source: z.enum(["IGDB", "manual"]),
  })
  .strict();
export const timesSchema = z
  .object({
    main: timeEstimate.optional(),
    extras: timeEstimate.optional(),
    complete: timeEstimate.optional(),
  })
  .strict();
export const gameSchema = z
  .object({
    times: timesSchema.optional(),
    id,
    title: text(160).min(1),
    catalogId: z.number().int().positive().optional(),
    cover: z
      .url()
      .max(500)
      .refine(
        (s) =>
          /^https:\/\/images\.igdb\.com\//.test(s) ||
          /^https:\/\/cdn\.cloudflare\.steamstatic\.com\//.test(s),
      )
      .optional(),
    genres: z.array(text(60)).max(12),
    approximateHours: z.number().min(0).max(10000).optional(),
    platforms: z.array(text(60).min(1)).min(1).max(12),
    stores: z.array(text(60)).max(12),
    wishlist: z.boolean().optional(),
    favorite: z.boolean(),
    next: z.boolean(),
    rating: z.number().min(1).max(10).multipleOf(0.5).optional(),
    review: text(5000),
    spoilerNote: text(5000),
    primaryRunId: id,
    updatedAt: z.iso.datetime(),
  })
  .strict();
export const runSchema = z
  .object({
    id,
    gameId: id,
    label: text(80).min(1),
    platform: text(60).min(1),
    status: z.enum(statuses),
    completion: z.enum(["sin especificar", "historia", "100%"]),
    startedOn: localDate,
    completedOn: localDate.optional(),
    whereLeft: text(5000),
    rating: z.number().min(1).max(10).multipleOf(0.5).optional(),
    review: text(5000).optional(),
    completionMinutes: z.number().int().min(0).max(600000).optional(),
  })
  .strict();
export const activitySchema = z
  .object({
    id,
    gameId: id,
    date: localDate,
    runId: id.optional(),
    note: text(1000),
  })
  .strict()
  .refine(
    (a) => a.id === activityId(a.gameId, a.date),
    "La actividad no coincide con su juego y fecha.",
  );
export const profileSchema = z
  .object({
    name: text(80),
    bio: text(300),
    timezone: text(80).refine((s) => {
      try {
        new Intl.DateTimeFormat("es", { timeZone: s });
        return true;
      } catch {
        return false;
      }
    }, "Zona horaria no válida"),
    avatarVersion: id.optional(),
  })
  .strict();
export const listSchema = z
  .object({
    id,
    name: text(80).trim().min(1),
    description: text(1000),
    gameIds: z.array(id).max(LIMITS.games),
  })
  .strict();
export const sagaSchema = z
  .object({
    id,
    name: text(100).trim().min(1),
    description: text(3000),
    order: z.enum(["release", "story", "recommended"]),
    source: text(500),
    entries: z
      .array(
        z
          .object({
            alternatives: z
              .array(
                z
                  .object({
                    catalogId: z.number().int().positive(),
                    title: text(160).min(1),
                  })
                  .strict(),
              )
              .max(12)
              .optional(),
            catalogId: z.number().int().positive().optional(),
            gameId: id.optional(),
            title: text(160).min(1),
            cover: z
              .url()
              .max(500)
              .refine(
                (s) =>
                  /^https:\/\/images\.igdb\.com\//.test(s) ||
                  /^https:\/\/cdn\.cloudflare\.steamstatic\.com\//.test(s),
              )
              .optional(),
            releaseDate: z.union([localDate, z.literal("")]),
            chapter: text(100),
            note: text(1500),
            optional: z.boolean(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export const librarySchema = z
  .object({
    sagas: z.array(sagaSchema).max(30).optional(),
    lists: z.array(listSchema).max(50).optional(),
    revision: z.number().int().nonnegative(),
    games: z.array(gameSchema).max(LIMITS.games),
    runs: z.array(runSchema).max(LIMITS.runs),
    activities: z.array(activitySchema).max(LIMITS.activities),
    profile: profileSchema,
  })
  .strict()
  .superRefine((s, ctx) => {
    try {
      assertLibrary(s);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
  });
export const backupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    data: librarySchema,
  })
  .strict();
export const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("batch-status"),
      gameIds: z.array(id).min(1).max(LIMITS.games),
      status: z.enum(statuses),
      date: localDate,
    })
    .strict(),
  z
    .object({
      type: z.literal("batch-list"),
      gameIds: z.array(id).min(1).max(LIMITS.games),
      listId: id,
    })
    .strict(),
  z
    .object({
      type: z.literal("save-day"),
      date: localDate,
      items: z
        .array(z.object({ gameId: id, runId: id, note: text(1000) }).strict())
        .min(1)
        .max(200)
        .refine(
          (a) => new Set(a.map((x) => x.gameId)).size === a.length,
          "Juegos repetidos",
        ),
    })
    .strict(),
  z.object({ type: z.literal("save-saga"), saga: sagaSchema }).strict(),
  z.object({ type: z.literal("delete-saga"), id }).strict(),
  z
    .object({
      type: z.literal("add-activities"),
      gameId: id,
      runId: id,
      dates: z.array(localDate).min(1).max(62),
      note: text(1000),
    })
    .strict(),
  z.object({ type: z.literal("save-list"), list: listSchema }).strict(),
  z.object({ type: z.literal("delete-list"), id }).strict(),
  z
    .object({
      type: z.literal("save-game"),
      game: gameSchema,
      run: runSchema.optional(),
    })
    .strict(),
  z.object({ type: z.literal("delete-game"), id }).strict(),
  z
    .object({
      type: z.literal("link-catalog"),
      items: z
        .array(
          z
            .object({
              gameId: id,
              catalogId: z.number().int().positive(),
              cover: gameSchema.shape.cover,
              genres: z.array(text(60)).max(12).optional(),
            })
            .strict(),
        )
        .min(1)
        .max(LIMITS.games)
        .refine(
          (items) => new Set(items.map((i) => i.gameId)).size === items.length,
          "Juegos repetidos",
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("save-run"),
      run: runSchema,
      primary: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("save-activity"),
      activity: activitySchema,
      previousId: id.optional(),
    })
    .strict(),
  z.object({ type: z.literal("delete-activity"), id }).strict(),
  z.object({ type: z.literal("profile"), profile: profileSchema }).strict(),
  z
    .object({
      type: z.literal("import"),
      data: librarySchema,
      policy: z.enum(["skip", "replace"]),
    })
    .strict(),
]);
export const mutationSchema = z
  .object({ revision: z.number().int().nonnegative(), command: commandSchema })
  .strict();

// El dominio no depende de Zod; estas comprobaciones de tipos evitan que los
// esquemas y los tipos del dominio se desincronicen.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const schemasMatchDomain: [
  Same<z.infer<typeof gameSchema>, Game>,
  Same<z.infer<typeof runSchema>, Run>,
  Same<z.infer<typeof activitySchema>, Activity>,
  Same<z.infer<typeof profileSchema>, Profile>,
  Same<z.infer<typeof listSchema>, GameList>,
  Same<z.infer<typeof sagaSchema>, Saga>,
] = [true, true, true, true, true, true];
void schemasMatchDomain;
