// Typed accessors for environment variables. Feature code must import from
// here (or lib/config.ts) — never read process.env inline (CLAUDE.md env rule).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  site: {
    // Public origin used for absolute URLs (metadataBase, sitemap,
    // canonicals). Falls back to the dev-server origin locally; must be set
    // to the real domain in production (T26 checks this).
    url: () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100",
  },
  supabase: {
    url: () => required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    // Server-only: bypasses RLS. Never import from a Client Component.
    serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  },
  stripe: {
    secretKey: () => required("STRIPE_SECRET_KEY"),
    webhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
    premiumPriceId: () => required("NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID"),
  },
  highlevel: {
    apiKey: () => required("HIGHLEVEL_API_KEY"),
    locationId: () => required("HIGHLEVEL_LOCATION_ID"),
  },
  googlePlaces: {
    apiKey: () => required("GOOGLE_PLACES_API_KEY"),
  },
  cron: {
    secret: () => required("CRON_SECRET"),
  },
} as const;
