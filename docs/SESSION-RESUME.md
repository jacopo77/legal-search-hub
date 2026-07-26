# Session Resume — 2026-07-25

Where we stopped mid-launch (T26). Read this first when resuming.

## Current state — what is DONE and verified

- **26/26 v1 build tasks code-complete**; full pre-launch audit (security,
  billing, rule compliance) done and merged (PR #5).
- **Production deploys green** on Vercel project `legal-search-hub` after
  fixing the silent build crash (root cause: `next/font/google` downloading
  fonts at build time — replaced with a system font stack; sitemap also made
  fully dynamic). Node pinned via `engines: >=20`.
- **Redesign live**: brand palette (#3D87C0/#1E3A5F/#E53935), gavel logo
  nav, full-viewport Phoenix skyline hero with city-parameterized copy
  (migration 0005), red search button, white chips.
- **Migrations 0004 + 0005 applied** to the correct Supabase project
  (`rxycqygjwuhzfwevmqdj`) — note: they were first run against the WRONG
  project; if anything DB-related 404s, suspect that again.
- **18 real Phoenix firms seeded** (3 per practice area), verified live on
  `/phoenix`. Seed data in `db/seed/firms.json`.
- **Vercel Authentication (auth wall) disabled** — site is public.
- **Env vars on Vercel** (production + preview): Supabase ×3, CRON_SECRET,
  NEXT_PUBLIC_SITE_URL=https://legalsearchhub.com. GOOGLE_PLACES_API_KEY
  still missing (needed only for the T13 rating cron; also absent from
  .env.local).
- **Supabase auth URLs saved**: Site URL https://legalsearchhub.com,
  redirect URLs for legalsearchhub.com + the vercel.app alias.
- **research.legalsearchhub.com live** — the ai-legal-assistant research
  app moved there (A record → 76.76.21.21 at Hostinger, verified HTTP 200).
- **Root domain assigned** to `legal-search-hub` in Vercel (force-moved
  from ai-legal-assistant via CLI) — but NOT YET SERVING (see blocker).
- **app.legalsearchhub.com deliberately untouched** (CNAME →
  whitelabel.ludicrous.cloud = SmartDirectoryAI white-label, kept alive
  until their 100-lead bonus lands, then SmartDirectoryAI is cancelled).

## 🔴 BLOCKER — where we stopped

**legalsearchhub.com root still resolves to 104.236.53.124**
(SmartDirectoryAI's DigitalOcean infra, serves a "Default Title" page).
The Hostinger DNS zone will not let the user EDIT the existing `A @`
record to change it to Vercel's IP `76.76.21.21`. The zone accepts new
records (the `research` record was added fine) — the `@` record is locked,
most likely because the domain is in Hostinger's "parked" state
(nameservers are ns1/ns2.dns-parking.com).

Note: having `@` and `research` both point to 76.76.21.21 is NOT a
conflict — different names may share an IP. Only duplicate names conflict.

## EXACT NEXT ACTION when resuming

1. In Hostinger (hPanel → Domains → legalsearchhub.com → DNS Zone), get
   rid of the locked `A @ → 104.236.53.124` record:
   a. Try DELETE (trash icon) — editing is blocked but deletion may work;
      then add `A @ → 76.76.21.21`.
   b. If delete is blocked: look for a "Parked"/"Unpark" toggle on the
      domain and turn parking off, then retry (a).
   c. If still stuck: Hostinger 24/7 live chat — ask them to remove the
      parked A record for @.
   d. Fallback: switch nameservers to Vercel (ns1/ns2.vercel-dns.com) —
      but FIRST re-create in Vercel's DNS panel: `research` A →
      76.76.21.21 and `app` CNAME → whitelabel.ludicrous.cloud, or both
      subdomains break. 24–48h propagation.
2. Verify: `curl https://legalsearchhub.com` shows the Phoenix hero
   ("Find Phoenix Attorneys You Can Trust"). A background watcher can
   confirm.

## Remaining T26 steps after DNS (in order)

1. **Stripe live**: create live Premium product/price → set
   `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`; live webhook →
   `https://legalsearchhub.com/api/webhooks/stripe` with events
   checkout.session.completed / customer.subscription.deleted /
   invoice.payment_failed → set live `STRIPE_SECRET_KEY` +
   `STRIPE_WEBHOOK_SECRET`. Push to Vercel via `vercel env add` (CLI is
   installed + logged in; see the push script pattern in session history).
2. **HighLevel live**: set live `HIGHLEVEL_API_KEY` +
   `HIGHLEVEL_LOCATION_ID` on Vercel; confirm workflows listen for the
   four tags: `new-signup`, `claim-request`/`edit-request`,
   `premium-checkout`, `firm-lead` (firm-lead is how leads reach firms).
3. **Optional**: Sentry project → `NEXT_PUBLIC_SENTRY_DSN` (app no-ops
   without it).
4. **google_place_id** for each of the 18 firms (manual, Google Maps) so
   the T13 rating cron has something to sync. GOOGLE_PLACES_API_KEY also
   needed for this.
5. **Production smoke test** (docs/LAUNCH.md §7): signup → admin approve
   → magic-link sign-in → upgrade checkout → webhook flips tier →
   premium edit → lead form → claim form.
6. Consider `www` CNAME → cname.vercel-dns.com if www.legalsearchhub.com
   should resolve.

## Decisions locked this session (don't relitigate)

- SmartDirectoryAI: cancel after 100-lead bonus; excluded from all build
  tasks. T27 wires HighLevel directly from our app's trigger tags.
- Greptile: user wants it as the review tool (installed, repo indexed);
  CodeRabbit deliberately unused.
- Launch first, Phase 2 (T27–T30) after. SmartDirectoryAI feature audit
  complete: docs/SMARTDIRECTORY-AUDIT.md + docs/smartdirectory-audit/.
- Domain layout: root → directory; research. → ai-legal-assistant;
  app. → SmartDirectoryAI until cancelled.
