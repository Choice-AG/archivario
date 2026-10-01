import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminAuth } from "./firebase";
import { isDeleting } from "./lifecycle";
import { needsVerification } from "@/features/account/verification";
import { reportError } from "@/lib/monitoring";
import { DomainError } from "@/features/library/domain/model";
import { ConflictError } from "@/features/library/application/ports";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization",
};
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: privateHeaders });
}
export async function authenticate(request: Request, allowDeletion = false) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer "))
    throw new HttpError(401, "Inicia sesión para continuar.");
  let user;
  try {
    user = await adminAuth().verifyIdToken(bearer.slice(7), true);
  } catch {
    throw new HttpError(401, "La sesión ha caducado. Inicia sesión de nuevo.");
  }
  if (!allowDeletion && (await isDeleting(user.uid)))
    throw new HttpError(
      409,
      "La cuenta se está eliminando. Puedes reintentar su eliminación desde ajustes.",
    );
  return user;
}
// El catálogo consume la cuota compartida de IGDB: las cuentas nuevas deben
// confirmar su correo antes de usarlo.
const creationTimes = new Map<string, string>();
export async function authenticateCatalog(request: Request) {
  const user = await authenticate(request);
  if (user.email_verified) return user;
  let created = creationTimes.get(user.uid);
  if (!created) {
    created = (await adminAuth().getUser(user.uid)).metadata.creationTime;
    creationTimes.set(user.uid, created);
  }
  if (needsVerification(false, created))
    throw new HttpError(
      403,
      "Confirma tu correo para buscar en el catálogo. Revisa tu bandeja de entrada.",
    );
  return user;
}
// Límite en memoria por instancia: frena ráfagas sin gastar lecturas de Firestore.
const windows = new Map<string, { start: number; count: number }>();
export function throttle(key: string, max: number, windowMs = 60000) {
  const now = Date.now(),
    current = windows.get(key);
  const entry =
    current && now - current.start < windowMs
      ? current
      : { start: now, count: 0 };
  if (entry.count >= max)
    throw new HttpError(429, "Demasiados cambios seguidos. Espera un momento.");
  entry.count++;
  windows.set(key, entry);
  if (windows.size > 5000)
    for (const [k, v] of windows)
      if (now - v.start >= windowMs) windows.delete(k);
}
export async function body(request: Request, max = 500000) {
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new HttpError(413, "El archivo es demasiado grande.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Faltan los datos.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "El archivo es demasiado grande.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON no válido.");
  }
}
export async function route(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof ZodError)
      return json({ error: e.issues[0]?.message ?? "Datos no válidos." }, 400);
    if (e instanceof DomainError) return json({ error: e.message }, 400);
    if (e instanceof ConflictError) return json({ error: e.message }, 409);
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    reportError(e);
    // Solo nombre y mensaje: nunca el cuerpo de la petición.
    console.error(
      "Error de API",
      e instanceof Error ? e.name + ": " + e.message : "Error",
    );
    return json(
      { error: "No se ha podido completar la operación. Inténtalo de nuevo." },
      500,
    );
  }
}
