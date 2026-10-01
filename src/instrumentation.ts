import { sentryDsn, sentryOptions } from "@/lib/monitoring";

export async function register() {
  if (!sentryDsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(sentryOptions());
}

export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (!sentryDsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
