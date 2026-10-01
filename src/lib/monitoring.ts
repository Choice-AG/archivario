// Registro de errores con Sentry, desactivado mientras no haya DSN.
// Nunca se envían datos personales ni contenido de la biblioteca: solo el
// tipo de error, el mensaje y la traza, con la URL sin parámetros.
type Sentry = typeof import("@sentry/nextjs");
type SentryEvent = import("@sentry/nextjs").ErrorEvent;

export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function scrub(event: SentryEvent): SentryEvent {
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
  }
  return event;
}

export function sentryOptions() {
  return {
    dsn: sentryDsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    beforeSend: scrub,
  };
}

let loaded: Promise<Sentry> | undefined;
function sentry() {
  loaded ??= import("@sentry/nextjs");
  return loaded;
}

export function reportError(error: unknown) {
  if (!sentryDsn) return;
  sentry()
    .then((s) => s.captureException(error))
    .catch(() => {});
}
