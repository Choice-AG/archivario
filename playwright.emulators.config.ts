import { defineConfig } from "@playwright/test";

// Pruebas de extremo a extremo contra los emuladores de Auth y Firestore.
// Se lanzan con `npm run test:e2e:emulators`, que arranca los emuladores.
const port = 3200;
const ci = !!process.env.CI;
export default defineConfig({
  testDir: "./tests/e2e-emulators",
  fullyParallel: false,
  workers: 1,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 300000,
    env: {
      NEXT_DIST_DIR: ".next-emulators",
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "127.0.0.1",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-archivario",
      NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR: "http://127.0.0.1:9099",
      NEXT_PUBLIC_EMAIL_VERIFICATION_SINCE: "2000-01-01T00:00:00Z",
      // Ninguna credencial ni servicio real durante las pruebas.
      FIREBASE_SERVICE_ACCOUNT_JSON: "",
      GOOGLE_APPLICATION_CREDENTIALS: "",
      IGDB_CLIENT_ID: "",
      IGDB_CLIENT_SECRET: "",
      STEAM_API_KEY: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
});
