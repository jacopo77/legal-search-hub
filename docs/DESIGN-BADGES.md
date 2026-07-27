# CLAIM / PREMIUM listing badges

Status: **implemented** (migration 0006). This document records the
approved design and the decisions behind it, for anyone touching this
feature later.

## Summary

Two status badges overlay the image area of directory listing cards:

- **CLAIM** — top-left. Red box `#E53935`, white lettering, white border,
  chamfered corners. Shows while a listing is unclaimed; disappears
  automatically once claimed.
- **PREMIUM** — top-right. Navy box `#1E3A5F`, gold lettering `#FBBF24`,
  same border/chamfer treatment. Admin-toggled, kept in sync by Stripe.

Plus an admin "All listings" table with three per-firm toggles: listing
on/off, CLAIM badge, PREMIUM badge.

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
| `claim_badge_hidden` | boolean not null | false | Admin override: suppress CLAIM badge on an unclaimed firm |
| `premium_badge` | boolean not null | false | PREMIUM badge on/off (admin + Stripe webhook) |

Display logic (derived, not duplicated state):

- CLAIM badge shows ⟺ `owner_id IS NULL AND NOT claim_badge_hidden`
- PREMIUM badge shows ⟺ `premium_badge = true`

Deliberately **not** added: `is_premium` (would duplicate `tier`),
`is_claimed` (duplicates `owner_id`), `is_active` (duplicates `status`).

Both columns are appended to the privileged-column list in
`guard_firms_privileged_columns()` — admin/service-role only, same as
`status`/`tier`, so owners can't toggle their own badges.

## Admin dashboard — "All listings" section

`components/admin/moderation-queue.tsx` gets a third section below the
existing pending-firms and change-request queues, listing every
`live`/`suspended` firm with:

- **Claimed** — read-only, derived from `owner_id`.
- **Listing** — toggles `status` `live` ↔ `suspended`.
- **CLAIM badge** — toggles `claim_badge_hidden`; only rendered while
  unclaimed (shows "— (claimed)" once claimed, since the badge is already
  auto-off).
- **PREMIUM badge** — always-available toggle for `premium_badge`.

Mechanics follow the existing T16 pattern: plain
`<form method="POST" action="/api/admin/firms/[id]">` per toggle with a
hidden `intent` field, handled by `app/api/admin/firms/[id]/route.ts`
(`toggle-listing`, `toggle-claim-badge`, `toggle-premium-badge`), redirect
back to `/admin`. No client JS.

## Badge component — `components/listings/status-badge.tsx`

One shared component, two variants (`claim` | `premium`).

Chamfered corners use `clip-path: polygon(...)`, which clips away any CSS
border along with the box — so the white border is faked with two nested
clipped layers: an outer white layer (the border) and an inner layer
inset by the border width, holding the fill color and label, clipped with
the same polygon shape. The polygon uses `calc(100% - Npx)` on both axes
rather than fixed pixel widths, so the chamfer stays correct regardless of
the badge's actual (content-driven) width.

| | CLAIM | PREMIUM |
|---|---|---|
| Position | absolute, top-left | absolute, top-right |
| Background | `#E53935` | `#1E3A5F` |
| Lettering | White | Gold `#FBBF24` |
| Border | White, nested-layer technique | same |
| Chamfer | 5px cut, all corners | same |

Wired into both branches of `FreeListingCard` (real logo and
`FirmLogoPlaceholder`) and into `PremiumListingCard`'s logo box (replacing
the amber pill). Card queries (`listing-section.tsx`, `lib/search.ts`,
`app/[city]/firms/page.tsx`) select `owner_id`, `claim_badge_hidden`,
`premium_badge`; `mapFirmRow` in `components/listings/types.ts` maps them
onto `ListingFirm`.

## Automation

```
claim request (T17, unchanged) → admin reviews (T16, unchanged)
  → admin sets firms.owner_id (manual, unchanged)
  → CLAIM badge condition (owner_id IS NULL) now false → badge gone.
```

No event code needed — the badge derives from `owner_id`, so it tracks
truth regardless of how a claim is granted.

Edge cases:

| Case | Behavior |
|---|---|
| Claim revoked (`owner_id` nulled) | CLAIM badge reappears automatically |
| Revoked while `claim_badge_hidden = true` | Stays hidden — the admin override persists |
| Unclaimed + premium-badged | Both badges render (opposite corners) |
| Claim granted on a premium-badged firm | PREMIUM untouched — independent |
| Listing toggled off (`suspended`) | Card no longer renders publicly at all; badge state is preserved and resumes when toggled back on |
