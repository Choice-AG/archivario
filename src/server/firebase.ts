import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function app() {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  // Con emuladores no hay credenciales; se exige un proyecto demo-* para que
  // un despliegue mal configurado nunca apunte al emulador.
  if (
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    if (!projectId?.startsWith("demo-"))
      throw new Error("Los emuladores solo se usan con proyectos demo-*.");
    return initializeApp({ projectId });
  }
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  // Vercel receives the credential as a server-only environment variable.
  // Local development can continue using GOOGLE_APPLICATION_CREDENTIALS.
  let credential;
  if (serviceAccount) {
    const data = JSON.parse(serviceAccount);
    if (data.project_id !== projectId)
      throw new Error("La credencial no pertenece al proyecto configurado.");
    credential = cert(data);
  } else {
    credential = applicationDefault();
  }
  return initializeApp({ credential, projectId });
}
export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());
