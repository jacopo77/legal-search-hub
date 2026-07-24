# Legal Search Hub — Product Requirements (v1)

## 1. Summary

Legal Search Hub is an attorney/law-firm directory web app. Visitors search for a
firm by name, practice area, or keyword, filtered to a city. Firms get a free
directory listing or pay for a premium listing with richer content and top
placement. Legal Search Hub LLC operates from a physical office in Phoenix, AZ,
which is the launch market and the address used for the Google Business Profile.

Company/marketing/lead-nurture lives in HighLevel (GoHighLevel), not in this
app. This app is the public directory + the system of record for listing data;
it pushes events to HighLevel rather than replacing it.

## 2. Goals (v1)

- Launch a credible, real (non-empty) Phoenix directory on day one.
- Let any Phoenix law firm sign up for a free listing.
- Let firms upgrade to a premium listing and pay via Stripe.
- Keep the architecture city-agnostic from the start: adding Tucson,
  Flagstaff, or an out-of-state market later is a data change (new `cities`
  row) plus content, not a new template or a new codebase.
- Ship a national, city-agnostic homepage component now (unlinked in nav) so
  the multi-city future doesn't require a homepage rebuild later.
- Keep NAP (Name, Address, Phone, hours) for Legal Search Hub itself
  identical everywhere it appears, matching the Google Business Profile
  exactly, for local SEO trust.
- Favor a small number of well-built sections over broad feature coverage.

## 3. Non-goals (v1)

See `docs/TASKS.md` "Phase 2" section for the authoritative, dependency-ordered
list. In summary, not in v1: blog/legal-news content, sponsored ad placement
for local news outlets, a public legal-research lead-magnet tool integration,
attorney-level (as opposed to firm-level) profiles, native on-platform
reviews, a firm-facing analytics dashboard, and rollout to any city beyond
Phoenix.

## 4. Users

- **Site visitor** — searches for a firm, browses by practice area, contacts
  a premium firm directly, or claims/suggests an edit to an existing listing.
- **Firm owner** — signs up for a free listing, or upgrades to premium;
  authenticates via magic link; edits their own firm's listing.
- **Admin (internal)** — approves new self-serve signups before they go
  public, reviews claim/edit requests, manages city and practice-area
  reference data.

## 5. Core concepts & decisions

### 5.1 Listing granularity: firms only

A listing is a **firm**, not an individual attorney. This matches the "List
Your Firm" CTA and the AZ-Bar-sourced seed data. Attorney-level sub-profiles
(individual attorney pages nested under a firm) are an explicit Phase 2 item;
the schema is designed so that's an additive `attorneys` table with a
`firm_id` foreign key later, not a migration of existing data.

### 5.2 Seeding strategy: manual, from public AZ State Bar data

At launch, the directory is not empty. A curated set of real Phoenix firms is
entered manually from the public Arizona State Bar directory — not an
automated scrape or a purchased list, to avoid data-provenance and accuracy
risk. Every firm row nonetheless carries a claimed/unclaimed status and a
nullable owner reference from day one, so a seeded listing can later be
claimed by its real owner without a schema migration. The full self-serve
claim *verification* workflow (proving you own a firm) is **not** built in
v1 — v1 only provides a simple "Is this your firm? Claim it / Suggest an
edit" form that files a request for an admin to action manually.

### 5.3 Trust signal: Google ratings, not native reviews

Firm listings display a Google rating and review count pulled from the
Google Places API. There is no on-platform review submission or moderation
system in v1 — this sidesteps fake-review risk and the bar-rule nuances
around attorney review solicitation, while still giving visitors a real
trust signal. Native reviews are a Phase 2 candidate once there's traffic
and firm demand to justify the moderation overhead.

### 5.4 Free vs. Premium tier

| | Free | Premium |
|---|---|---|
| Placement | Standard "Free" section, unordered/by recency | "Premium" section, above Free, visually distinct |
| Practice areas | 1 | Multiple |
| Logo | No | Yes |
| Photo gallery | No | Yes |
| Bio | Short | Long |
| Lead capture | None (visitors see phone/address only) | "Contact this firm" form, routed to HighLevel |
| Analytics | None | None — lead/view visibility comes from HighLevel's own reporting, not a native dashboard, to avoid building a second analytics surface HighLevel already provides for the events that matter (contact-form leads, signups) |

A firm's core record (name, address, phone, hours, one practice area,
short bio, Google rating) is identical in shape between tiers; premium adds
fields and unlocks the lead form, it doesn't change the underlying entity.

### 5.5 Moderation (assumption — flag for confirmation)

New self-serve signups (free or premium) are created in a `pending` status
and require a lightweight admin approval (a single status toggle) before
they appear publicly. This wasn't explicitly specified, but some gate is
needed to keep an open signup form from filling the directory with spam or
non-attorney listings; a single-admin approve/reject queue is the smallest
version of that gate. Manually-seeded firms are inserted directly as `live`.
This is easy to loosen (auto-publish) or tighten later — flagged here as an
assumption, not a locked decision.

## 6. Routing & homepage behavior

- `/phoenix` — the permanent, canonical Phoenix city page: skyline hero,
  search, practice-area chips, premium + free listing sections. This is the
  URL used for the Google Business Profile and all Phoenix NAP/SEO data.
  Built as the `phoenix` instance of a general `[city]` route so that adding
  Tucson later is a new `cities` row, not new route code.
- `/` (root) — controlled by a single `HOMEPAGE_MODE` constant
  (`"phoenix" | "national"`). At launch, `HOMEPAGE_MODE = "phoenix"` and root
  renders the exact same city-page component and data as `/phoenix` (no
  duplicated markup, no duplicated data fetch). Flipping to `"national"`
  later, once a second city is live, is a one-line change.
- `/company` — the national, city-agnostic homepage, built now but **not**
  linked from primary nav yet. No hero photo; clean background, headline,
  search bar, and a crawlable "Browse by City" list (Phoenix links to
  `/phoenix`; other planned cities render as non-clickable "Coming Soon").
  This is the same component `/` will render once `HOMEPAGE_MODE` flips to
  `"national"`.

## 7. NAP consistency

Legal Search Hub LLC's own name, physical address, phone number, and hours
(not any listed firm's info) must read identically on `/phoenix` and in the
sitewide footer, and must match the Google Business Profile exactly. This is
sourced from a single config constant, never hand-typed in more than one
place — see `docs/ARCHITECTURE.md` §4.6.

## 8. Hero section (`/phoenix`, mirrored on `/`)

- Full-bleed Phoenix skyline photo, bold white headline. The headline
  component must wrap gracefully at common viewport widths — no manual
  `<br>` forcing a fixed break point.
- One-line subtext, functional only (what the tool does), not a second
  competing emotional line.
- Search bar placeholder: "Search by attorney name, practice area, or
  keyword" (Phoenix/attorney-specific, not generic template copy).
- 5–6 clickable practice-area chips under the search bar: Family Law, DUI,
  Personal Injury, Estate Planning, Immigration, Business Law.
- Primary CTA for firms: "List Your Firm" (leads to signup) — an existing
  unclaimed listing's detail page instead shows "Claim Your Listing".
- A city selector lives in the nav near the logo now. At launch it has one
  enabled option (Phoenix) and renders other cities from the `cities` table
  as disabled/"Coming Soon" — so no redesign is needed when a second city
  ships.

## 9. Page structure below the hero (v1)

1. **Premium listings** — visually distinct section, logo shown, priority
   placement.
2. **Free listings** — standard directory card, any signed-up firm.
3. **Footer** — NAP info (§7), plus reserved layout space for a future
   "Legal Insights" content section (not built in v1 — see Phase 2).

## 10. Integrations

- **HighLevel** — receives, via API/webhook, every: new firm signup,
  completed Stripe premium checkout, "Contact this firm" lead-form
  submission, and claim/edit request. HighLevel owns nurture, notification
  of firms about leads, and admin follow-up tasking for claim/edit requests.
  See `docs/ARCHITECTURE.md` §5 for exact trigger → payload mapping.
- **Stripe** — premium listing billing. Checkout for upgrade, webhook to
  confirm payment and flip a firm to premium, webhook to handle
  cancellation/downgrade.
- **Google Places API** — per-firm rating + review count, refreshed
  periodically rather than on every page view.
- **Google Business Profile / Maps** — Legal Search Hub LLC's own NAP data
  (§7) must match this exactly.

## 11. Success criteria for v1 launch

- `/phoenix` is live with a non-trivial number of real, accurate Phoenix
  firm listings (seeded) plus a working free-signup path.
- A firm can go from "List Your Firm" click to a pending listing, get
  approved, and appear on `/phoenix`.
- A firm can upgrade to premium, pay via Stripe, and see their listing move
  to the Premium section with the richer profile fields.
- All four HighLevel triggers fire correctly and are visible in HighLevel.
- NAP data matches the Google Business Profile exactly on `/phoenix` and in
  the footer.
- `/company` exists, is crawlable, and correctly shows Phoenix as live and
  other planned cities as "Coming Soon", without being linked from nav.
