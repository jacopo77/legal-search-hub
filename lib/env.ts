// Typed accessors for environment variables. Feature code must import from
// here (or lib/config.ts) — never read process.env inline (CLAUDE.md env rule).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Next.js only inlines NEXT_PUBLIC_* vars into Client Component bundles when
// it can statically find a literal `process.env.NEXT_PUBLIC_X` expression at
// the call site — `process.env[name]` with a variable (as `required` above
// does) can't be statically analyzed, so it silently reads as undefined in
// the browser even though the var is genuinely set. This wrapper takes the
// already-read value so the static `process.env.NEXT_PUBLIC_X` reference
// stays inline at each call site while still sharing one error message.
function requiredPublic(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  site: {
    // Public origin used for absolute URLs (metadataBase, sitemap,
    // canonicals). Falls back to the dev-server origin locally; must be set
    // to the real domain in production (T26 checks this). Trimmed and
    // trailing-slash-stripped: empty/whitespace values would bypass ?? and
    // crash new URL(), and a trailing slash would double up when consumers
    // append paths.
    url: () => {
      const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      return (value || "http://localhost:3100").replace(/\/+$/, "");
    },
  },
  supabase: {
    url: () =>
      requiredPublic("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: () =>
      requiredPublic(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
    // Server-only: bypasses RLS. Never import from a Client Component.
    serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  },
  stripe: {
    secretKey: () => required("STRIPE_SECRET_KEY"),
    webhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
    premiumPriceId: () =>
      requiredPublic(
        "NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID",
        process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
      ),
    premiumAnnualPriceId: () =>
      requiredPublic(
        "NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID",
        process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID,
      ),
  },
  highlevel: {
    apiKey: () => required("HIGHLEVEL_API_KEY"),
    locationId: () => required("HIGHLEVEL_LOCATION_ID"),
    // Inbound-webhook trigger for the "List Your Firm" signup workflow —
    // a plain pre-authorized POST URL, distinct from the apiKey/locationId
    // pair above (those are for the authenticated contacts/opportunities
    // REST API).
    webhookUrl: () => required("HIGHLEVEL_WEBHOOK_URL"),
  },
  googlePlaces: {
    apiKey: () => required("GOOGLE_PLACES_API_KEY"),
  },
  googleMaps: {
    // Public Maps Embed API key — used for iframe embeds on firm detail pages.
    // Optional: falls back to the no-key embed format if unset.
    embedApiKey: () => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  },
  cron: {
    secret: () => required("CRON_SECRET"),
  },
  sentry: {
    // Optional: empty string disables Sentry (local dev default). Set in
    // production (T26). Public DSN — safe for the browser bundle.
    dsn: () => process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  },
} as const;
