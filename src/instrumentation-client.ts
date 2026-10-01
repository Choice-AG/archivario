import { sentryDsn, sentryOptions } from "@/lib/monitoring";

// Solo se descarga el SDK si hay DSN configurado.
if (sentryDsn)
  import("@sentry/nextjs")
    .then((Sentry) => Sentry.init(sentryOptions()))
    .catch(() => {});
