# CLAIM / PREMIUM listing badges

Status: **PREMIUM badge implemented** (migration 0006); **CLAIM badge
removed 2026-08-02**. This document records the approved design and the
decisions behind it, for anyone touching this feature later. The CLAIM
badge sections below are kept as history (see git blame) — full grid
coverage of unclaimed firms read as "this directory is mostly empty," so
the card badge was dropped in favor of an on-page prompt instead (see
"CLAIM badge — removed" below).

## Summary

One status badge overlays the image area of directory listing cards:

- **PREMIUM** — top-right. Navy box `#1E3A5F`, gold lettering `#FBBF24`,
  same border/chamfer treatment. Admin-toggled, kept in sync by Stripe.

Plus an admin "All listings" table with two per-firm toggles: listing
on/off, PREMIUM badge.

## CLAIM badge — removed

The CLAIM badge (red `#E53935` box, top-left of the card image, shown
while `owner_id IS NULL`) is no longer rendered. Two problems drove the
removal: red reads as a warning/alarm color, which fights with it being a
positive call-to-action; and showing it on every unclaimed card (most of
the catalog, pre-launch) made the whole directory read as unused rather
than prompting claims. `firms.claim_badge_hidden` and the admin toggle for
it are removed from the app; the DB column itself is left in place
(unused) rather than migrated away.

In its place, `components/firms/firm-detail.tsx` renders an inline
"Is this your business? Claim it" prompt under the About/bio section,
gated on `firm.owner_id === null` — same derivation as the old badge, so
it disappears automatically once claimed, no separate flag required. This
targets a higher-intent moment (an owner landing on their own listing)
rather than a browsing visitor scanning the grid.

## Decisions locked

1. Badges are **visual-only**, not links.
2. The PREMIUM badge **replaced** the old amber "Featured" pill on
   `PremiumListingCard`.
3. PREMIUM colors: navy background, gold lettering.
4. **No grant-claim button.** Claiming stays as it was (admin sets
   `owner_id` manually, via whatever process); the CLAIM badge derives
   from `owner_id`, so it turns off automatically however the claim is
   granted.
5. Stripe webhook auto-sets `premium_badge` (true on
   `checkout.session.completed`, false on `customer.subscription.deleted`)
   — the admin toggle is a manual override in both directions.
6. Listing on/off toggle uses the existing `firms.status`
   (`live` ↔ `suspended`) — no separate `is_active` column.
7. Badges appear on **cards only** (not the firm detail header), and
   overlay whatever image the card is showing — a real company photo/logo
   (`logo_url`) or the generated SVG placeholder — identically, since the
   badge is just an absolutely-positioned layer on top of either.

## Data model — `db/migrations/0006_listing_badges.sql`

Added to `public.firms`:

| Column | Type | Default | Meaning |
|---|---|---|---|
| `claim_badge_hidden` | boolean not null | false | **Unused** since the CLAIM badge removal — column left in place, not read by the app |
| `premium_badge` | boolean not null | false | PREMIUM badge on/off (admin + Stripe webhook) |

Display logic (derived, not duplicated state):

- PREMIUM badge shows ⟺ `premium_badge = true`
- The claim CTA on the firm detail page shows ⟺ `owner_id IS NULL`

Deliberately **not** added: `is_premium` (would duplicate `tier`),
`is_claimed` (duplicates `owner_id`), `is_active` (duplicates `status`).

Both columns are appended to the privileged-column list in
`guard_firms_privileged_columns()` — admin/service-role only, same as
`status`/`tier`, so owners can't toggle their own badges. (`claim_badge_hidden`
was left in that list too — harmless since nothing writes to it anymore.)

## Admin dashboard — "All listings" section

`components/admin/moderation-queue.tsx` gets a third section below the
existing pending-firms and change-request queues, listing every
`live`/`suspended` firm with:

- **Claimed** — read-only, derived from `owner_id`.
- **Listing** — toggles `status` `live` ↔ `suspended`.
- **PREMIUM badge** — always-available toggle for `premium_badge`.

(The CLAIM badge toggle column was removed along with the badge itself —
there's nothing left for it to control.)

Mechanics follow the existing T16 pattern: plain
`<form method="POST" action="/api/admin/firms/[id]">` per toggle with a
hidden `intent` field, handled by `app/api/admin/firms/[id]/route.ts`
(`toggle-listing`, `toggle-premium-badge`), redirect back to `/admin`. No
client JS.

## Badge component — `components/listings/status-badge.tsx`

One shared component, now a single `premium` variant (the `claim` variant
was removed along with the badge).

Chamfered corners use `clip-path: polygon(...)`, which clips away any CSS
border along with the box — so the white border is faked with two nested
clipped layers: an outer white layer (the border) and an inner layer
inset by the border width, holding the fill color and label, clipped with
the same polygon shape. The polygon uses `calc(100% - Npx)` on both axes
rather than fixed pixel widths, so the chamfer stays correct regardless of
the badge's actual (content-driven) width.

| | PREMIUM |
|---|---|
| Position | absolute, top-right |
| Background | `#1E3A5F` |
| Lettering | Gold `#FBBF24` |
| Border | White, nested-layer technique |
| Chamfer | 5px cut, all corners |

Wired into both branches of `FreeListingCard` (real logo and
`FirmLogoPlaceholder`) and into `PremiumListingCard`'s logo box (replacing
the amber pill). Card queries (`listing-section.tsx`, `lib/search.ts`,
`app/[city]/firms/page.tsx`) select `premium_badge`; `mapFirmRow` in
`components/listings/types.ts` maps it onto `ListingFirm`. `owner_id` is no
longer part of `ListingFirm`/`FirmRow` at all — it was only ever needed for
the CLAIM badge condition.

## Automation

```
claim request (T17, unchanged) → admin reviews (T16, unchanged)
  → admin sets firms.owner_id (manual, unchanged)
  → firm-detail.tsx's "Is this your business?" condition (owner_id IS
    NULL) now false → CTA gone.
```

No event code needed — the CTA derives from `owner_id`, so it tracks truth
regardless of how a claim is granted.

Edge cases:

| Case | Behavior |
|---|---|
| Claim revoked (`owner_id` nulled) | Claim CTA reappears automatically |
| Unclaimed + premium-badged | PREMIUM badge renders on the card; claim CTA renders on the detail page — independent |
| Claim granted on a premium-badged firm | PREMIUM untouched — independent |
| Listing toggled off (`suspended`) | Card no longer renders publicly at all; badge state is preserved and resumes when toggled back on |
