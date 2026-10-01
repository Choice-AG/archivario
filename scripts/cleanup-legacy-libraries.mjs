// Borra los documentos del formato 1 (users/{uid}/private/library) de las
// bibliotecas que ya se migraron al formato por bloques hace tiempo.
//
// Por defecto SOLO SIMULA: muestra qué borraría sin tocar nada.
//
//   node scripts/cleanup-legacy-libraries.mjs                 # simulación
//   node scripts/cleanup-legacy-libraries.mjs --days 60       # margen distinto
//   node scripts/cleanup-legacy-libraries.mjs --apply         # borra de verdad
//   node scripts/cleanup-legacy-libraries.mjs --undated-as 2026-10-01
//     # trata las migradas antes de guardar la fecha como migradas ese día
//
// Credenciales: GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de la
// cuenta de servicio, y FIREBASE_PROJECT_ID con el id del proyecto.
//
// Solo se borra un documento antiguo si se cumplen TODAS estas condiciones:
// - existe el índice library-v2 con fecha de migración (migratedAt);
// - la migración ocurrió hace más de --days días (30 por defecto);
// - la revisión del formato nuevo es mayor o igual que la del antiguo;
// - existen todos los bloques que el índice declara.
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const daysArg = args.indexOf("--days");
const days = daysArg >= 0 ? Number(args[daysArg + 1]) : 30;
if (!Number.isFinite(days) || days < 7) {
  console.error("--days debe ser un número de al menos 7.");
  process.exit(1);
}
const undatedArg = args.indexOf("--undated-as");
const undatedAs =
  undatedArg >= 0 ? Date.parse(args[undatedArg + 1] + "T00:00:00Z") : undefined;
if (undatedArg >= 0 && !Number.isFinite(undatedAs)) {
  console.error("--undated-as necesita una fecha AAAA-MM-DD.");
  process.exit(1);
}
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error("Falta FIREBASE_PROJECT_ID.");
  process.exit(1);
}
if (process.env.FIRESTORE_EMULATOR_HOST && !projectId.startsWith("demo-")) {
  console.error("Con el emulador solo se admiten proyectos demo-*.");
  process.exit(1);
}

initializeApp(
  process.env.FIRESTORE_EMULATOR_HOST
    ? { projectId }
    : { credential: applicationDefault(), projectId },
);
const db = getFirestore();
const cutoff = Date.now() - days * 86400000;
const KEYS = ["games", "runs", "activities", "lists", "sagas"];

let checked = 0,
  eligible = 0,
  skipped = 0,
  deleted = 0;
const users = await db.collection("users").listDocuments();
for (const user of users) {
  const legacyRef = user.collection("private").doc("library");
  const metaRef = user.collection("private").doc("library-v2");
  const [legacy, meta] = await db.getAll(legacyRef, metaRef);
  if (!legacy.exists) continue;
  checked++;
  const m = meta.data();
  const migrated = m?.migratedAt ? Date.parse(m.migratedAt) : undatedAs;
  const reason = !meta.exists
    ? "sin migrar"
    : migrated === undefined
      ? "sin fecha de migración (usa --undated-as)"
      : migrated > cutoff
        ? "migrada hace menos de " + days + " días"
        : m.revision < (legacy.data().revision ?? 0)
          ? "revisión nueva menor que la antigua"
          : null;
  if (reason) {
    skipped++;
    console.log(`- ${user.id}: se conserva (${reason})`);
    continue;
  }
  const chunkRefs = KEYS.flatMap((k) =>
    (m.chunks?.[k] ?? []).map((_, i) =>
      user.collection("libraryChunks").doc(k + "-" + i),
    ),
  );
  const chunks = chunkRefs.length ? await db.getAll(...chunkRefs) : [];
  if (chunks.some((c) => !c.exists)) {
    skipped++;
    console.log(`- ${user.id}: se conserva (faltan bloques del formato nuevo)`);
    continue;
  }
  eligible++;
  if (apply) {
    await legacyRef.delete();
    deleted++;
    console.log(`✓ ${user.id}: documento antiguo borrado`);
  } else console.log(`· ${user.id}: se borraría`);
}

console.log(
  `\n${checked} documentos antiguos revisados · ${eligible} listos para borrar · ${skipped} conservados` +
    (apply
      ? ` · ${deleted} borrados`
      : "\nSimulación: no se ha borrado nada. Usa --apply para borrar."),
);
