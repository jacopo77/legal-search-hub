import * as Sentry from "@sentry/nextjs";

// Next.js instrumentation hook (T24): runs once at server startup. Loads
// the Sentry server config for the Node.js runtime, and routes captured
// server errors (RSC renders, route handlers, proxy) to Sentry via
// onRequestError.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
