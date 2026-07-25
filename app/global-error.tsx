"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Last-resort error boundary: catches errors thrown in the root layout
// itself, where no nested boundary can. Reports to Sentry (no-op without a
// DSN) and renders a minimal standalone page — the normal layout (nav,
// footer, fonts) may be what's broken, so this can't rely on any of it.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <h1>Something went wrong</h1>
        <p>
          The page failed to load. Try again — if it keeps happening, the
          team has been notified.
        </p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
