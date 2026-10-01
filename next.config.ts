import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
// Destino de Sentry, solo si está configurado.
const sentryHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SENTRY_DSN
      ? " https://" + new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).host
      : "";
  } catch {
    return "";
  }
})();
// Pruebas con el emulador de Auth (http://127.0.0.1:9099).
const authEmulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR
  ? " " + process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR
  : "";
const images = "https://images.igdb.com https://cdn.cloudflare.steamstatic.com";
const csp = [
  "default-src 'self'",
  // Next.js inserta scripts en línea para la hidratación.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${images}`,
  "font-src 'self' data:",
  `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com${sentryHost}${authEmulator}`,
  `frame-src ${authDomain ? "https://" + authDomain : "'none'"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev || authEmulator ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const config: NextConfig = {
  poweredByHeader: false,
  // Las pruebas con emuladores compilan aparte para no pisar la build normal.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async headers() {
    return [
      {
        // El service worker debe revisarse en cada visita para actualizarse.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};
export default config;
