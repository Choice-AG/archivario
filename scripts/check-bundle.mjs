// Presupuesto de rendimiento: suma el JavaScript (comprimido con gzip) que
// carga cada página al abrirse y falla si supera el límite. Se ejecuta tras
// `npm run build` y en CI, para detectar PRs que hagan la app más pesada.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = process.env.NEXT_DIST_DIR ?? ".next";
// Límite holgado sobre el tamaño actual; súbelo solo con motivo.
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 400);
const pages = ["index", "diario", "calendario", "favoritos", "proximos"];

let failed = false;
for (const page of pages) {
  const file = join(dist, "server", "app", page + ".html");
  if (!existsSync(file)) {
    console.error(`No existe ${file}: ejecuta antes npm run build.`);
    process.exit(1);
  }
  const html = readFileSync(file, "utf8");
  const scripts = [
    ...new Set(
      [...html.matchAll(/src="\/_next\/(static\/[^"]+\.js)"/g)].map(
        (m) => m[1],
      ),
    ),
  ];
  const bytes = scripts.reduce(
    (sum, s) => sum + gzipSync(readFileSync(join(dist, s))).length,
    0,
  );
  const kb = bytes / 1024;
  const ok = kb <= BUDGET_KB;
  failed ||= !ok;
  console.log(
    `${ok ? "✓" : "✗"} /${page === "index" ? "" : page}: ${kb.toFixed(1)} KB de JS inicial (gzip) · límite ${BUDGET_KB} KB`,
  );
}
if (failed) {
  console.error(
    "\nUna página supera el presupuesto de JavaScript. Revisa qué se importa en el cliente o carga partes bajo demanda.",
  );
  process.exit(1);
}
