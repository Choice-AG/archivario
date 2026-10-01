import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
export const configured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
);
export function clientAuth() {
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  const auth = getAuth(app);
  connectEmulator(auth);
  return auth;
}
// Solo en las pruebas con emuladores: nunca contra un proyecto real.
let emulatorConnected = false;
function connectEmulator(auth: Auth) {
  const url = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR;
  if (!url || emulatorConnected) return;
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith("demo-"))
    throw new Error("El emulador solo se usa con proyectos demo-*.");
  connectAuthEmulator(auth, url, { disableWarnings: true });
  emulatorConnected = true;
}
