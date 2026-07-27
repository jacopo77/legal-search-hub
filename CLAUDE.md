# CLAUDE.md — Legal Search Hub conventions

@AGENTS.md

Read `docs/PRD.md` and `docs/ARCHITECTURE.md` before making structural
changes. This file is the day-to-day rulebook for any coding session
(human or model) working in this repo.

## Project in one paragraph

Legal Search Hub is a Next.js (App Router) attorney/law-firm directory,
launching in Phoenix, AZ, on Supabase (Postgres + Auth + Storage) + Vercel,
with Stripe for premium billing and HighLevel as the external CRM/nurture
system. It is architected to add more cities and, later, other states via
data (a `cities` row), never via a new template or a parallel codebase.

## Hard rules — do not violate

1. **One city template.** There is exactly one city page component and one
   Hero component. Never create a Phoenix-specific route, component, or
   copy that a second city couldn't also use. If you catch yourself writing
   `if (city === "phoenix")` in a component, stop — that logic belongs in
   data (the `cities` table), not code.
2. **`HOMEPAGE_MODE` is the only thing that decides what `/` renders.**
   Don't special-case the root route beyond reading `lib/config.ts`.
   `/company` always renders the national homepage regardless of this flag.
3. **NAP never gets hand-typed twice.** Legal Search Hub LLC's own name,
   address, phone, and hours come from the single `COMPANY_NAP` constant in
   `lib/config.ts`. If a component needs this data, import the constant —
   never inline the address/phone as a string literal anywhere else.
4. **Firms only, in v1.** Do not add an attorney-level entity/table/route
   unless a task in `docs/TASKS.md` explicitly calls for it. If a feature
   seems to want "attorney," check whether it actually means "firm."
5. **No native review system.** Trust signal is the cached Google
   rating/review count on `firms`. Don't add review submission, star-rating
   input, or a moderation queue for reviews without an explicit task.
6. **HighLevel and Stripe calls are server-only.** Never import
   `lib/highlevel.ts` or `lib/stripe.ts` from a Client Component or expose
   their API keys to the browser. All four HighLevel triggers (new signup,
   Stripe checkout completed, contact-form lead, claim/edit request) go
   through the shared `lib/highlevel.ts` wrapper — don't hand-roll a fetch
   to HighLevel's API elsewhere.
7. **A failed HighLevel/Stripe side-effect must not fail the primary write.**
   The local Postgres row (`firms`, `leads`, `firm_change_requests`) is the
   source of truth. Sync to HighLevel is best-effort with its own retry/
   status field (`synced_to_highlevel`, etc.) — never wrap the DB insert and
   the external API call in a way where the external call failing rolls
   back or blocks the user-facing action.
8. **Don't build Phase 2 items.** Blog/content section, sponsored ad
   placement, the legal-research lead-magnet integration, native reviews, a
   firm analytics dashboard, attorney sub-profiles, additional
   cities/states, and full claim-verification automation are explicitly out
   of scope until `docs/TASKS.md` Phase 2 is reached. If asked to build
   something reserved footer space implies (e.g., "Legal Insights"), check
   TASKS.md first.

## Stack conventions

- **Language**: TypeScript, strict mode. No `any` without a comment
  explaining why it's unavoidable.
- **Components**: Server Components by default. Add `"use client"` only
  when the component needs interactivity/state/browser APIs (forms with
  local state, the search bar, city selector dropdown). Keep client
  components as small/leaf as possible — don't push `"use client"` up to a
  whole page when only a sub-part needs it.
- **Data fetching**: Server Components fetch directly via the Supabase
  server client (`lib/supabase/server.ts`). Mutations (signup, claim/edit
  request, lead submission) go through `app/api/**/route.ts` handlers, not
  Server Actions, so they compose cleanly with the Stripe/HighLevel webhook
  handlers that already live in `app/api`. Stay consistent with this choice
  rather than mixing Server Actions and API routes for similar operations.
- **Styling**: Tailwind CSS + shadcn/ui. Match existing component patterns
  before introducing a new one-off style. Design priority is clean,
  professional, uncluttered — when in doubt, cut a section rather than add
  one.
- **Forms**: react-hook-form + zod schemas colocated with the form. Validate
  the same shape server-side in the API route (don't trust client
  validation alone).
- **Naming**: kebab-case for routes/files, PascalCase for components, camelCase
  for functions/variables. Table and column names in Postgres are
  snake_case (Supabase/Postgres convention); map to camelCase at the data
  access boundary, not throughout the app.
- **IDs**: `uuid` primary keys everywhere (matches Supabase defaults).
- **Env vars**: every external key (Supabase, Stripe, HighLevel, Google
  Places) is read from `process.env` in a single typed accessor (extend
  `lib/config.ts` or add `lib/env.ts`), never accessed inline via
  `process.env.X` scattered through feature code. Never commit a real key —
  `.env.local` is gitignored; `.env.example` documents the required names
  with placeholder values.

## Data model reminders (see ARCHITECTURE.md §4 for full detail)

- `firms.owner_id` is nullable — null means unclaimed/seeded, not an error
  state. Code that renders a firm must handle both.
- `firms.status` (`pending`/`live`/`rejected`/`suspended`) gates public
  visibility. Public/anon queries must always filter `status = 'live'` —
  this filter belongs in the query layer (or RLS policy), not sprinkled
  ad hoc in components.
- Free tier = 1 practice area; premium = multiple. This limit is enforced in
  application logic at write time, not a DB constraint — don't assume the
  DB will reject a second free-tier practice area; check in code.
- `profiles.stripe_customer_id`, not `firms.stripe_customer_id` — billing
  identity is on the owner, not the listing, since one owner could own more
  than one firm.

## Git / workflow

- Small, dependency-ordered commits following `docs/TASKS.md` task
  boundaries — one task per PR/commit where practical.
- Don't reorder or skip ahead in TASKS.md without checking whether a later
  task depends on something the skipped task provides.
- When a planning assumption in `docs/ARCHITECTURE.md` §10 turns out to be
  wrong once real product feedback comes in, update that section rather
  than silently diverging from it in code.

## CLAIM / PREMIUM listing badges (built)

Full design spec: `docs/DESIGN-BADGES.md`. Superseded the earlier draft of
this note (which had the colors/shapes backwards — kept here only as
history, see git blame if needed).

- **CLAIM badge** (top-left of card image): red background `#E53935`,
  white lettering, white border, chamfered corners. Shows when
  `firms.owner_id IS NULL AND NOT claim_badge_hidden`. No click behavior
  in v1 — visual status only.
- **PREMIUM badge** (top-right of card image): navy background `#1E3A5F`,
  gold lettering `#FBBF24`, same border/chamfer. Shows when
  `firms.premium_badge = true`. Replaced the old amber "Featured" pill.
- Both badges derive from existing/added columns rather than duplicating
  state: CLAIM from `owner_id`, PREMIUM from the dedicated
  `firms.premium_badge` flag (kept in sync by the Stripe webhook, with the
  admin toggle as an override — not the same thing as `firms.tier`).
- `firms.claim_badge_hidden` and `firms.premium_badge` (migration 0006) are
  privileged columns — admin/service-role only, same as `status`/`tier`.
- `/admin` has an "All listings" table (live/suspended firms) with three
  toggles per row: listing on/off (`status`), CLAIM badge, PREMIUM badge —
  same POST-form pattern as the T16 moderation queue, no client JS.
