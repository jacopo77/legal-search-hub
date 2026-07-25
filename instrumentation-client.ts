import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

// Browser-side Sentry init (T24). Next loads instrumentation-client.ts
// before any hydration code. No DSN = disabled locally.
Sentry.init({
  dsn: env.sentry.dsn() || undefined,
  enabled: Boolean(env.sentry.dsn()),
  tracesSampleRate: 0,
});

// Route-transition capture is required by the SDK even with tracing off —
// it's how client navigations stay associated with error reports.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
