# Session Resume — 2026-07-27

Read this first when resuming work on Legal Search Hub. (Folded in the old
root-level `RESUME.md`, which had drifted out of sync with git history —
this file is now the single resume doc.)

## Daily startup prompt

Paste this into the session right after launching `claude` in this repo:

> Read CLAUDE.md and docs/TASKS.md, pick up from the next incomplete task,
> and tell me where we are before starting anything new. Also check the
> last git commit message to confirm what was most recently completed.

## Model / session note

This project can run Claude Code on Kimi K3 (Moonshot AI) via
`.claude/settings.local.json` in this repo root — that file holds the live
`ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_MODEL` env vars and is
gitignored (holds a real API token). It only takes effect for a session
launched with cwd inside this repo.

## Current state — what is DONE and verified

- **26/26 v1 build tasks (T1–T26) code-complete**; full pre-launch audit
  (security, billing, rule compliance) done and merged (PR #5).
- **Production deploys green** on Vercel project `legal-search-hub` after
  fixing the silent build crash (root cause: `next/font/google` downloading
  fonts at build time — replaced with a system font stack; sitemap also made
  fully dynamic). Node pinned via `engines: >=20`.
- **Redesign live and iterated repeatedly** since the first pass:
  - Brand palette (#3D87C0/#1E3A5F/#E53935), gavel logo nav, full-viewport
    Phoenix skyline hero with city-parameterized copy (migration 0005), red
    search button, white chips.
  - Navbar logo went through several size/crop passes (rectangular crop,
    scaled down, then enlarged again) to its current look.
  - Footer went through several background/logo iterations, settling on a
    navy background with white text and the cropped logo next to hours.
  - Divorce practice-area chip added next to Family Law in the hero.
  - Phoenix listings page redesigned: split into "Featured Listings"
    (premium) and "All Firms," premium placeholder cards (dark navy SVG,
    gavel icon, FEATURED badge), compact free cards with a dynamic SVG
    placeholder and seeded shuffle for variety, always-visible "View All"
    button.
  - Firm detail pages gained embedded Google Maps + Street View (plain
    iframe embed, after trying and dropping `@react-google-maps/api`).
  - Firm detail header redesigned: removed the prominent amber "Unclaimed
    listing" badge in favor of a discreet top-left "Claim" link plus
    top-right "Claim This Listing" / "Go Premium" buttons; the old
    "Is this your firm?" intake section was removed so pages read as
    actively managed listings.
  - `scripts/scrape-firm-images.js` (Supabase + node-html-parser + sharp)
    scraped hero/office/logo images from each firm's own website for all 18
    seeded firms into `public/firms/*.jpg`. Some results are just small
    logos/banners and may need manual replacement.
- **Migrations 0004 + 0005 applied** to the correct Supabase project
  (`rxycqygjwuhzfwevmqdj`) — note: they were first run against the wrong
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
  from ai-legal-assistant via CLI) — but NOT YET SERVING (see blocker,
  unconfirmed whether still open — verify before assuming).
- **app.legalsearchhub.com deliberately untouched** (CNAME →
  whitelabel.ludicrous.cloud = SmartDirectoryAI white-label, kept alive
  until their 100-lead bonus lands, then SmartDirectoryAI is cancelled).

## Uncommitted in the working tree (as of `b3ed964`)

- `CLAUDE.md` has an uncommitted addition: **"Current work session — Badge
  system & Admin dashboard."** This is a plan, not code in progress —
  neither the `ClaimBadge`/`PremiumBadge` components nor the
  `firms.is_premium`/`firms.is_active` columns exist yet. It's distinct from
  the already-shipped T16 approve/reject moderation queue and from the
  Phase-2 T30 directory-health dashboard in `docs/TASKS.md` — don't conflate
  the three. Decide whether to commit this note and start building, or
  discard it.

## 🔴 BLOCKER — where we stopped (last confirmed state, re-verify on resume)

**legalsearchhub.com root still resolved to 104.236.53.124**
(SmartDirectoryAI's DigitalOcean infra, serves a "Default Title" page) as of
the last DNS check. The Hostinger DNS zone would not let the user EDIT the
existing `A @` record to change it to Vercel's IP `76.76.21.21`. The zone
accepts new records (the `research` record was added fine) — the `@` record
is locked, most likely because the domain is in Hostinger's "parked" state
(nameservers are ns1/ns2.dns-parking.com).

Note: having `@` and `research` both point to 76.76.21.21 is NOT a
conflict — different names may share an IP. Only duplicate names conflict.

### Exact next action when resuming (if still blocked)

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
