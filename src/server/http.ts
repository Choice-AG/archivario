import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminAuth } from "./firebase";
import { isDeleting } from "./lifecycle";
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
    console.error("Error de API", e instanceof Error ? e.name : "Error");
    return json(
      { error: "No se ha podido completar la operación. Inténtalo de nuevo." },
      500,
    );
  }
}
