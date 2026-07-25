# Legal Search Hub — Architecture (v1)

Companion to `docs/PRD.md` (what/why) and `docs/TASKS.md` (build order). This
doc is the how: stack, data model, routing mechanics, and integration
contracts.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js, App Router | Server Components by default; see `CLAUDE.md` for the client/server boundary rule |
| Database | Postgres via **Supabase** | Chosen over Neon so Auth + Storage + Postgres are one platform with one connection story |
| Auth | Supabase Auth, **magic link only** | No passwords. Firm owners log in infrequently; passwordless removes reset-flow maintenance |
| File storage | Supabase Storage | Buckets: `firm-logos`, `firm-gallery` (premium only), `city-hero-images` (admin-managed) |
| Hosting | Vercel | |
| Payments | Stripe (Checkout + webhooks) | Single premium plan (monthly) in v1 |
| CRM / marketing | HighLevel (API + webhooks) | System of record for nurture, leads, and follow-up tasking — not duplicated in this app |
| External data | Google Places API | Rating/review count only, cached, not live-fetched per page view |
| Styling | Tailwind CSS + shadcn/ui | **Assumption** — not specified by the user; chosen for fast, consistent, accessible components matching "clean, professional, uncluttered." Revisit if there's an existing design system. |
| Forms/validation | react-hook-form + zod | **Assumption**, standard pairing for the Next.js/TS stack |

## 2. Folder structure

```
app/
  page.tsx                     # root "/" — reads HOMEPAGE_MODE, renders CityPage("phoenix") or NationalHome
  company/
    page.tsx                   # "/company" — always renders NationalHome, unlinked in nav
  [city]/
    page.tsx                   # "/phoenix", and any future city — the one city-page template
    firms/
      [slug]/
        page.tsx               # firm detail page
  admin/
    page.tsx                   # role-gated internal moderation queue
    ...
  api/
    listings/route.ts          # POST — new firm signup
    listings/[id]/claim/route.ts   # POST — claim/edit request intake
    leads/route.ts             # POST — "Contact this firm" submissions
    webhooks/
      stripe/route.ts          # Stripe webhook receiver
components/
  hero/                        # Hero, parameterized by city — never hardcodes "Phoenix"
  listings/                    # PremiumListingCard, FreeListingCard, ListingSection
  nav/                         # SiteNav, CitySelector
  home/
    NationalHome.tsx           # used by both app/company and app/page.tsx (national mode)
lib/
  config.ts                    # HOMEPAGE_MODE, company NAP constant
  supabase/
    client.ts                  # browser client
    server.ts                  # server/RSC client
  highlevel.ts                 # thin wrapper: createOrUpdateContact(), createOpportunity(), createTask()
  stripe.ts                    # Stripe SDK init + helpers
  google-places.ts             # fetch + cache rating/review count
  search.ts                    # Postgres full-text/trigram query builder
db/
  migrations/                  # SQL migrations (Supabase CLI)
  seed/                        # seed scripts — cities, practice areas, launch firms
docs/
  PRD.md
  ARCHITECTURE.md
  TASKS.md
CLAUDE.md
```

Key rule: there is exactly **one** city-page template (`app/[city]/page.tsx`)
and exactly **one** Hero component. `/phoenix` is not a special-cased,
separately-coded route — it's the `[city]` route resolving `city = "phoenix"`
against the `cities` table. This is what makes "add Tucson" a data change,
not a template rebuild.

## 3. Routing / homepage-mode mechanics

```ts
// lib/config.ts
export const HOMEPAGE_MODE: "phoenix" | "national" = "phoenix";
```

- `app/[city]/page.tsx` — loads the `cities` row for the slug; 404s (or
  redirects) if the city doesn't exist or isn't `live`. Renders `<Hero
  city={city} />` + `<ListingSection tier="premium">` + `<ListingSection
  tier="free">`. Fully data-driven — no per-city branching in code.
- `app/page.tsx` (root) —
  ```ts
  if (HOMEPAGE_MODE === "phoenix") {
    return <CityPageContent citySlug="phoenix" />; // same component [city]/page.tsx uses internally
  }
  return <NationalHome />;
  ```
  To avoid duplicating the city page's data-fetching/rendering logic between
  `app/[city]/page.tsx` and `app/page.tsx`, the actual page body lives in a
  shared `CityPageContent` component that both the dynamic route and the
  root route call — the route files themselves are thin wrappers.
- `app/company/page.tsx` — always renders `<NationalHome />` regardless of
  `HOMEPAGE_MODE`. Not linked from `SiteNav` yet (a direct URL only). This is
  intentional: it's built and crawlable for SEO now, surfaced in nav later.
- `NationalHome` reads all `cities` rows and renders Phoenix as a link,
  every other row as a disabled "Coming Soon" item — no hardcoded city list.

## 4. Data model

All tables live in the `public` schema in Supabase Postgres. `auth.users` is
Supabase-managed; `profiles` extends it 1:1.

### 4.1 `cities`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | `"phoenix"` — used in the route |
| name | text | `"Phoenix"` |
| state | text | `"AZ"` |
| status | enum(`live`, `coming_soon`) | drives both the nav city-selector and `/company`'s Browse-by-City list |
| hero_image_url | text | skyline photo for this city's Hero |
| latitude / longitude | numeric, nullable | for future map view |
| sort_order | int | display order |

### 4.2 `practice_areas`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | `"family-law"` |
| name | text | `"Family Law"` |
| sort_order | int | controls chip order under the search bar |

Seeded at launch with the 6 named categories (Family Law, DUI, Personal
Injury, Estate Planning, Immigration, Business Law). Admin-extensible later;
not user-editable by firm owners.

### 4.3 `profiles` (extends `auth.users`)
| column | type | notes |
|---|---|---|
| id | uuid pk, fk → auth.users.id | |
| role | enum(`owner`, `admin`) | gates `/admin` |
| stripe_customer_id | text, nullable | set on first Stripe Checkout session; lives here (not on `firms`) so one owner can eventually own multiple firms without duplicating billing identity |
| created_at | timestamptz | |

### 4.4 `firms`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| city_id | uuid fk → cities.id | |
| owner_id | uuid fk → profiles.id, **nullable** | null = unclaimed (seeded); set once claimed |
| status | enum(`pending`, `live`, `rejected`, `suspended`) | seeded rows insert directly as `live`; self-serve signups start `pending` (§5.5 of PRD) |
| tier | enum(`free`, `premium`) | |
| name | text | |
| slug | text unique | |
| phone | text | |
| address | text | firm's own address — distinct from Legal Search Hub's own NAP (§4.6) |
| website | text, nullable | |
| hours | jsonb | `{ mon: "9-5", ... }` |
| bio_short | text | shown on free + premium |
| bio_long | text, nullable | premium only |
| logo_url | text, nullable | premium only, Supabase Storage `firm-logos` |
| bar_number | text, nullable | self-attested; no automated bar-lookup verification in v1 |
| google_place_id | text, nullable | |
| google_rating | numeric, nullable | cached |
| google_review_count | int, nullable | cached |
| google_rating_synced_at | timestamptz, nullable | drives refresh cadence |
| stripe_subscription_id | text, nullable | premium billing state |
| created_at / updated_at | timestamptz | |

### 4.5 `firm_practice_areas` (join table)
| column | type |
|---|---|
| firm_id | uuid fk → firms.id |
| practice_area_id | uuid fk → practice_areas.id |

Free tier is limited to one row per firm; premium allows multiple. Enforced
in application logic at write time (not a hard DB constraint), so the limit
can change without a migration.

### 4.6 `firm_gallery_images` (premium only)
| column | type |
|---|---|
| id | uuid pk |
| firm_id | uuid fk → firms.id |
| image_url | text |
| sort_order | int |

### 4.7 `firm_change_requests`
Backs both the "claim this listing" and "suggest an edit" actions on a firm
detail page, and is what fires the HighLevel claim/edit-request trigger. No
automated verification or auto-apply in v1 — an admin reviews and manually
updates the `firms` row.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| firm_id | uuid fk → firms.id | |
| type | enum(`claim`, `edit`) | |
| requester_name | text | |
| requester_email | text | |
| requester_phone | text, nullable | |
| message | text | free-form description of the requested change |
| status | enum(`pending`, `highlevel_synced`, `resolved`) | |
| created_at | timestamptz | |

### 4.8 `leads`
Backs "Contact this firm" (premium only), and is what fires the HighLevel
lead trigger.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| firm_id | uuid fk → firms.id | |
| name | text | |
| email | text | |
| phone | text, nullable | |
| message | text | |
| synced_to_highlevel | boolean default false | |
| created_at | timestamptz | |

### 4.9 Legal Search Hub's own NAP — not a table

Legal Search Hub LLC's name/address/phone/hours (used on `/phoenix` and the
sitewide footer, matching the Google Business Profile) is a **static config
constant** (`lib/config.ts`), not a database row:

```ts
export const COMPANY_NAP = {
  name: "Legal Search Hub LLC",
  address: "…", // exact Phoenix office address, matches GBP verbatim
  phone: "…",
  hours: { mon: "9:00 AM–5:00 PM", /* … */ },
} as const;
```

Rationale: this data changes only when the company itself moves or changes
hours — a code deploy, not a content edit — and a single imported constant
makes drift between the footer and `/phoenix` structurally impossible (both
read the same object; there's nowhere for the values to diverge). If this
ever needs non-developer editing, promote it to a one-row `site_settings`
table — the interface (`COMPANY_NAP`) stays the same either way.

## 5. HighLevel integration — triggers and payloads

All four confirmed triggers are outbound-only (this app → HighLevel);
HighLevel does not call back into this app. Each is a server-side call
through `lib/highlevel.ts`, fired from the relevant API route/webhook
handler, never from client code (HighLevel API key is server-only).

| Trigger | Fired from | HighLevel action |
|---|---|---|
| New firm signup (free or premium) | `POST /api/listings` handler, after the `firms` row is inserted as `pending` | `createOrUpdateContact()` — firm enters the nurture pipeline immediately, before admin approval |
| Premium checkout completed | `POST /api/webhooks/stripe`, on `checkout.session.completed` | `createOpportunity()` / move pipeline stage — this is the core revenue event |
| "Contact this firm" lead | `POST /api/leads`, after the `leads` row is inserted | `createOrUpdateContact()` for the lead + attach to the firm's HighLevel record, so HighLevel is the delivery path to the firm, not a direct email from this app |
| Claim/edit request | `POST /api/listings/[id]/claim`, after the `firm_change_requests` row is inserted | `createTask()` on the firm's HighLevel contact (or a new contact, if unclaimed) so an admin has a tracked follow-up item |

Each handler updates its own local row's sync status (`leads.synced_to_highlevel`,
`firm_change_requests.status`) after a successful HighLevel call, and retries
are the handler's responsibility — a failed HighLevel call must not fail the
local write (the local row is the source of truth; HighLevel sync is
best-effort with retry, not transactional with the DB write).

## 6. Stripe integration

- One premium plan (monthly recurring) in v1. Multiple tiers/annual billing
  are a config change (new Stripe Price ID), not an architecture change.
- Upgrade flow: firm owner (authenticated via magic link) clicks upgrade →
  server creates a Stripe Checkout Session with `client_reference_id =
  firm.id` → redirect to Stripe.
- `POST /api/webhooks/stripe` handles:
  - `checkout.session.completed` → set `firms.tier = "premium"`, store
    `stripe_subscription_id`, fire the HighLevel opportunity trigger (§5).
  - `customer.subscription.deleted` → set `firms.tier = "free"` and clear
    `stripe_subscription_id`.
  - `invoice.payment_failed` → log only (business rule decided at T19):
    Stripe dunning retries the card, and only the final failure deletes the
    subscription — which reverts the tier via the event above. Reverting on
    the first failed charge would flip paying firms to free mid-retry.
- `profiles.stripe_customer_id` is set on first Checkout session so repeat
  billing actions don't need to re-resolve identity.

## 7. Google Places integration

- `firms.google_place_id` set manually at seed time / by admin (not
  auto-matched — avoids mismatching a firm to the wrong Place).
- `lib/google-places.ts` fetches rating + review count for a given
  `place_id` and writes `google_rating`, `google_review_count`,
  `google_rating_synced_at` back onto the `firms` row.
- Refreshed on a schedule (e.g., a periodic Vercel Cron job hitting an
  internal route), not on every page render — bounds API cost and avoids a
  render-blocking external call on the hot path.

## 8. Search

- Postgres full-text search (`tsvector` generated column over `name`,
  `bio_short`, and joined `practice_areas.name`) plus `pg_trgm` for
  fuzzy/typo tolerance on firm name.
- Every query is scoped by `city_id` from the route — there is no
  cross-city search in v1 (matches the single-city launch and keeps result
  sets small).
- Practice-area chips are plain filter links (`?practiceArea=family-law`)
  against `firm_practice_areas`, not a text search — they're a fast path for
  visitors who don't know what to type, per the PRD.

## 9. Auth & authorization

- Supabase Auth, magic link only. Signing up for a free listing creates the
  `profiles` row and the `firms` row together (owner is set immediately for
  self-serve signups; `owner_id` stays null only for seeded/unclaimed firms).
- `profiles.role = "admin"` gates `/admin`. No self-serve path to become
  admin — set directly in the database for the (small) internal team.
- Row-level security (Supabase RLS) rule of thumb: a `profiles` row can only
  write to `firms` where `firms.owner_id = auth.uid()`; admins bypass via a
  role check in policy. Public (anon) reads are limited to `status = 'live'`
  firms and reference tables (`cities`, `practice_areas`).

## 10. Open assumptions to confirm before/while building

These were reasonable defaults chosen to keep planning moving, not decisions
the user explicitly made — flag/revisit if they don't fit:

1. Tailwind CSS + shadcn/ui as the component/styling layer.
2. react-hook-form + zod for form handling/validation.
3. New self-serve signups require admin approval (`pending` → `live`) before
   going public (PRD §5.5).
4. Single monthly premium plan in v1 (no annual option yet).
5. Google Place ID matched manually per firm, not auto-resolved.
6. Legal Search Hub's own NAP is a code constant, not an admin-editable DB
   row, until/unless non-developer editing is needed.
