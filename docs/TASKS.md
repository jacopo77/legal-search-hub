# Legal Search Hub — Build Tasks (v1)

Dependency-ordered. Each task is sized for one focused coding session. Don't
start a task before the ones it lists under "Depends on" are done. Phase 2
(bottom of this file) is explicitly not to be built yet — it's here so scope
doesn't creep back in mid-build.

## Phase 0 — Project & data foundation

**T1. Project scaffold**
Initialize Next.js (App Router, TypeScript, strict mode), Tailwind CSS +
shadcn/ui, ESLint/Prettier. Set up `.env.example` covering Supabase, Stripe,
HighLevel, and Google Places keys per `CLAUDE.md`'s env-var rule.
_Depends on: nothing._

**T2. Supabase project + client setup**
Create the Supabase project. Add `lib/supabase/client.ts` (browser) and
`lib/supabase/server.ts` (server/RSC). Confirm Auth (magic link) is enabled
and Storage buckets `firm-logos`, `firm-gallery`, `city-hero-images` exist.
_Depends on: T1._

**T3. Core schema migration**
Write SQL migrations for `cities`, `practice_areas`, `profiles`, `firms`,
`firm_practice_areas`, `firm_gallery_images`, `firm_change_requests`,
`leads` per `docs/ARCHITECTURE.md` §4. Add RLS policies per §9 (public read
of `live` firms + reference tables; owner-scoped write on `firms`; admin
bypass).
_Depends on: T2._

**T4. Reference + seed data**
Seed script: insert the Phoenix `cities` row (`status = live`) plus
placeholder rows for at least Tucson and Flagstaff (`status = coming_soon`,
used by `/company`'s Browse-by-City list). Seed the 6 launch
`practice_areas`. Manually enter a curated batch of real Phoenix firms
sourced from the public AZ State Bar directory as `firms` rows
(`status = live`, `owner_id = null`, `tier = free` unless a firm has agreed
to premium at launch).
_Depends on: T3._

**T5. Shared config**
Add `lib/config.ts`: `HOMEPAGE_MODE` constant and the `COMPANY_NAP` object
(Legal Search Hub LLC's real Phoenix address/phone/hours, matching the
Google Business Profile exactly — get the exact values from the user before
finalizing this file).
_Depends on: T1._

## Phase 1 — Core public pages

**T6. Site shell: nav + footer**
`SiteNav` (logo, `CitySelector` reading `cities` from Supabase — Phoenix
enabled, others disabled/"Coming Soon", "List Your Firm" CTA button) and
`SiteFooter` (renders `COMPANY_NAP`, reserves a visually distinct empty
block commented `{/* Legal Insights — Phase 2 */}` so future layout doesn't
require a redesign).
_Depends on: T5, T4._

**T7. Hero component**
Single, city-parameterized `Hero` component: full-bleed hero image (from
`cities.hero_image_url`), headline that wraps naturally at common
breakpoints (no manual `<br>`), one-line functional subtext, search input
with the Phoenix/attorney-specific placeholder, and 5–6 practice-area chips
rendered from `practice_areas` (linking to `?practiceArea=<slug>`).
_Depends on: T4._

**T8. City page template + listing sections**
`app/[city]/page.tsx` (thin) + shared `CityPageContent` component: resolve
city by slug, 404/redirect if not `live`, render `Hero`, then
`ListingSection tier="premium"` and `ListingSection tier="free"`, each
querying `firms` (status = live, city_id = current) with their practice
areas joined. Premium cards show logo + distinct styling; free cards are the
standard card.
_Depends on: T6, T7._

**T9. Root route wiring**
`app/page.tsx` reads `HOMEPAGE_MODE`; in `"phoenix"` mode renders
`CityPageContent` for the `phoenix` slug (same component T8 built, not a
copy); in `"national"` mode renders `NationalHome` (T10). Confirm both
`/` and `/phoenix` render identically today.
_Depends on: T8._

**T10. National homepage + `/company` route**
Build `NationalHome` (no hero photo, clean background, headline, search bar,
crawlable Browse-by-City list from the `cities` table — live cities are
links, `coming_soon` cities are non-clickable). Add `app/company/page.tsx`
rendering it. Do not link `/company` from `SiteNav` yet.
_Depends on: T4, T5._

**T11. Search + practice-area filtering**
`lib/search.ts`: Postgres full-text (`tsvector`) + trigram query against
`firms` scoped to `city_id`. Wire the Hero's search input and the
practice-area chips to a results view (can reuse `ListingSection` filtered
by query/practice area, or a dedicated `/[city]/search` results state).
_Depends on: T8._

## Phase 1.5 — Firm detail, signup, moderation

**T12. Firm detail page**
`app/[city]/firms/[slug]/page.tsx`: full profile (all fields from §4.4),
Google rating badge (from cached `google_rating`/`google_review_count`),
gallery for premium firms, "Claim Your Listing" CTA if `owner_id` is null,
"Contact this firm" form if premium (T18).
_Depends on: T8._

**T13. Google Places rating sync**
`lib/google-places.ts` + an internal cron-triggered route that refreshes
`google_rating`/`google_review_count`/`google_rating_synced_at` for firms
with a `google_place_id` set. Document how `google_place_id` gets set per
firm (manual, at seed/admin time — no auto-matching).
_Depends on: T3._

**T14. Free signup flow ("List Your Firm")**
Public form (name, address, phone, hours, one practice area, short bio) →
`POST /api/listings` → creates `profiles` (if new owner) + `firms` row
(`status = pending`, `tier = free`) → fires the HighLevel new-signup trigger
via `lib/highlevel.ts`. Magic-link auth happens as part of this flow for a
brand-new owner.
_Depends on: T3, T5._

**T15. HighLevel client wrapper**
`lib/highlevel.ts`: `createOrUpdateContact()`, `createOpportunity()`,
`createTask()`, each a thin typed wrapper over HighLevel's API. This is a
prerequisite for T14, T17, T18, T19 — build it once, share it everywhere,
per `CLAUDE.md` rule 6.
_Depends on: T1. (Build before or alongside T14.)_

**T16. Admin moderation queue**
`app/admin/page.tsx`, role-gated (`profiles.role = 'admin'`): list `pending`
firms with approve/reject actions, list open `firm_change_requests`. No
need for a polished UI — functional table + action buttons.
_Depends on: T3, T14._

**T17. Claim / edit-request intake**
On an unclaimed firm's detail page (T12), a lightweight form ("Is this your
firm? Claim it" / "Suggest an edit") → `POST /api/listings/[id]/claim` →
inserts `firm_change_requests` → fires the HighLevel claim/edit trigger.
Explicitly **no** automated ownership verification or auto-apply — admin
resolves manually via T16.
_Depends on: T12, T15, T16._

## Phase 1.75 — Premium billing

**T18. Stripe checkout for premium upgrade**
Upgrade button (owner-authenticated) → server creates a Stripe Checkout
Session (`client_reference_id = firm.id`) → redirect to Stripe.
_Depends on: T14._

**T19. Stripe webhook handler**
`POST /api/webhooks/stripe`: on `checkout.session.completed`, set
`firms.tier = "premium"`, store `stripe_subscription_id` and
`profiles.stripe_customer_id`, fire the HighLevel checkout-completed
trigger. On subscription cancellation/payment failure, revert tier.
_Depends on: T15, T18._

**T20. Premium profile editing**
Owner-facing edit form for premium-only fields: logo upload (Supabase
Storage `firm-logos`), gallery upload (`firm-gallery`, via
`firm_gallery_images`), multiple practice areas, long bio.
_Depends on: T19._

**T21. "Contact this firm" lead form**
On premium firm detail pages (T12): form → `POST /api/leads` → inserts
`leads` row → fires the HighLevel lead trigger.
_Depends on: T15, T20._

## Phase 1.9 — SEO & launch readiness

**T22. SEO metadata + structured data**
Per-city and per-firm `generateMetadata`, JSON-LD `LocalBusiness`/
`Attorney` schema, `sitemap.xml`, `robots.txt`. Confirm `/company` is
crawlable and indexable even though unlinked from nav.
_Depends on: T8, T10, T12._

**T23. NAP consistency check**
Manual audit: `/phoenix` hero/footer NAP vs. `COMPANY_NAP` vs. the actual
Google Business Profile — must match verbatim (including hours formatting).
_Depends on: T6._

**T24. Analytics + monitoring**
Wire basic site analytics (Vercel Analytics or GA4) and error monitoring.
No firm-facing analytics dashboard (that's explicitly out of scope — see
PRD §5.4).
_Depends on: T9._

**T25. Responsive/accessibility QA pass**
Check Hero headline wrapping at common breakpoints, keyboard navigation
through nav/search/chips/forms, color contrast on Premium vs. Free card
styling.
_Depends on: T8, T12._

**T26. Launch checklist**
Env var review for production, DNS/domain pointed at Vercel, Stripe switched
to live mode + live webhook URL, HighLevel live API keys/webhook URLs,
confirm seeded Phoenix data is accurate and complete.
_Depends on: everything above._

---

## Phase 2 — explicitly out of scope for v1

Do not build any of the following without a new planning pass. Listed here
so it's tracked, not forgotten:

- **Blog / legal news content section** (footer already reserves layout
  space for this — see T6).
- **Sponsored ad placement** for local news outlets to rent a spot near
  listings — revenue idea, needs real traffic numbers before it's sellable.
- **Legal research tool integration** as a free public lead magnet — an
  existing app that needs hallucination-reduction work before any public
  launch.
- **Attorney-level sub-profiles** nested under a firm (individual attorney
  pages) — additive `attorneys` table with `firm_id` FK when this is
  prioritized; no migration of existing `firms` data required.
- **Native on-platform reviews/ratings** — revisit once there's traffic and
  firm demand to justify a moderation queue and fake-review defenses.
- **Firm-facing analytics dashboard** — only if firms specifically need
  in-platform metrics HighLevel's own reporting can't provide.
- **Additional cities/states** (Tucson, Flagstaff, then Colorado, New
  Mexico, California) — architecturally just new `cities` rows + content
  per `docs/ARCHITECTURE.md`, but each still needs its own seed data pass,
  local SEO/NAP setup, and go-live decision.
- **Full self-serve claim/verification workflow** — v1 only captures a
  claim/edit *request* (T17) for manual admin resolution; automating
  identity verification (e.g., matching bar number + firm email domain) is
  a later build.
- **Automated bar-number verification** (e.g., an Arizona State Bar lookup
  API) — v1's `bar_number` field is self-attested and unverified.
