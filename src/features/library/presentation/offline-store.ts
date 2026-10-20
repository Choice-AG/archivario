"use client";
import type { Command, Library } from "../domain/model";
import { loadValidation } from "./validation-loader";

// Copia local de la biblioteca y cola de cambios hechos sin conexión. Solo
// vive en este dispositivo y se borra al cerrar sesión.
const cacheKey = (uid: string) => "archivario-cache-v1:" + uid;
const queueKey = (uid: string) => "archivario-queue-v1:" + uid;

export class OfflineError extends Error {
  constructor() {
    super("Sin conexión.");
  }
}

function raw(key: string): unknown {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}
// Lo guardado se valida antes de usarlo: si no es válido, se ignora.
async function read<T>(
  key: string,
  parse: (value: unknown, v: Awaited<ReturnType<typeof loadValidation>>) => T,
) {
  const value = raw(key);
  if (value === undefined) return undefined;
  try {
    return parse(value, await loadValidation());
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
  read(cacheKey(uid), (v, z) => z.librarySchema.parse(v) as Library);
export const saveCachedLibrary = (uid: string, state: Library) =>
  write(cacheKey(uid), state);

export const loadQueue = async (uid: string): Promise<Command[]> =>
  (await read(queueKey(uid), (v, z) =>
    Array.isArray(v) ? v.map((c) => z.commandSchema.parse(c) as Command) : [],
  )) ?? [];
// Cuántos cambios esperan, sin validarlos (para avisos y comprobaciones).
export function queueLength(uid: string) {
  const value = raw(queueKey(uid));
  return Array.isArray(value) ? value.length : 0;
}
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
