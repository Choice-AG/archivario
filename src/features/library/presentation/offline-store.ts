"use client";
import type { Command, Library } from "../domain/model";
import { commandSchema, librarySchema } from "../application/validation";

// Copia local de la biblioteca y cola de cambios hechos sin conexión. Solo
// vive en este dispositivo y se borra al cerrar sesión.
const cacheKey = (uid: string) => "archivario-cache-v1:" + uid;
const queueKey = (uid: string) => "archivario-queue-v1:" + uid;

export class OfflineError extends Error {
  constructor() {
    super("Sin conexión.");
  }
}

function read<T>(key: string, parse: (value: unknown) => T): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parse(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin espacio o sin almacenamiento: la app sigue funcionando en línea.
  }
}

export const loadCachedLibrary = (uid: string) =>
  read(cacheKey(uid), (v) => librarySchema.parse(v) as Library);
export const saveCachedLibrary = (uid: string, state: Library) =>
  write(cacheKey(uid), state);

export const loadQueue = (uid: string): Command[] =>
  read(queueKey(uid), (v) =>
    Array.isArray(v) ? v.map((c) => commandSchema.parse(c) as Command) : [],
  ) ?? [];
export const saveQueue = (uid: string, queue: Command[]) =>
  queue.length ? write(queueKey(uid), queue) : clearKey(queueKey(uid));

function clearKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
export function clearOfflineData(uid: string) {
  clearKey(cacheKey(uid));
  clearKey(queueKey(uid));
}
