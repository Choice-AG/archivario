"use client";
// La validación (Zod) pesa mucho y no hace falta para pintar la app: se
// descarga aparte, justo después de abrirla, y se reutiliza.
type Validation = typeof import("../application/validation");
let pending: Promise<Validation> | undefined;
export function loadValidation() {
  pending ??= import("../application/validation");
  return pending;
}
