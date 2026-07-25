import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

// Server-side Sentry init (T24), loaded once from instrumentation.ts. No
// DSN = disabled, so local dev and CI don't report anything. No edge
// config — this app doesn't use the edge runtime.
Sentry.init({
  dsn: env.sentry.dsn() || undefined,
  enabled: Boolean(env.sentry.dsn()),
  // Errors only in v1 — no performance tracing quota burn.
  tracesSampleRate: 0,
});
