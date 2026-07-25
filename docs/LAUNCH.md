# Launch Checklist (T26)

The operational go-live pass for v1. Code-side items are already verified in
the repo; the rest are account-side steps, in order. Check items off as they
land.

## Code-side (done — verified in repo)

- [x] `vercel.json` cron → `/api/cron/google-ratings` daily at 07:00 UTC
- [x] `.env.example` documents every required environment variable
- [x] `NEXT_PUBLIC_SITE_URL` accessor (falls back to localhost in dev)
- [x] Sitemap + robots + per-page SEO metadata (T22)
- [x] Sentry env-gated — no-ops without a DSN (T24)
- [x] Stripe webhook handler for upgrade/cancel/payment-failure (T19)
- [x] NAP audit vs. Google Business Profile — verbatim match (T23)

## 1. Vercel deploy

- [ ] Import `jacopo77/legal-search-hub` into Vercel (auto-deploys `main`)
- [ ] Set env vars in Project Settings:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_PLACES_API_KEY`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_SITE_URL=https://<domain>`
  - `NEXT_PUBLIC_SENTRY_DSN` (after creating a Sentry project)
  - Stripe + HighLevel vars — see steps 3–4

## 2. Supabase auth URLs (breaks magic links if skipped)

- [ ] Dashboard → Authentication → URL Configuration: Site URL = the domain
- [ ] Add `https://<domain>/auth/callback` to allowed redirect URLs
- [ ] Apply any pending migrations to the production project — currently
      `db/migrations/0004_public_insert_predicates.sql` (RLS tightening)

## 3. Stripe live mode

- [ ] Create the live Premium product/price → set
      `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` to the live price id
- [ ] Create a live webhook → `https://<domain>/api/webhooks/stripe` with
      events `checkout.session.completed`, `customer.subscription.deleted`,
      `invoice.payment_failed`
- [ ] Set `STRIPE_SECRET_KEY` (live) and `STRIPE_WEBHOOK_SECRET` (from the
      live webhook)

## 4. HighLevel live

- [ ] Set live `HIGHLEVEL_API_KEY` + `HIGHLEVEL_LOCATION_ID`
- [ ] Confirm workflows listen for the four trigger tags: `new-signup`,
      `claim-request` / `edit-request`, `premium-checkout`, `firm-lead`
      (the `firm-lead` workflow is how leads get delivered to firms)

## 5. DNS

- [ ] Point the domain at Vercel (A/CNAME per their dashboard)

## 6. Seed data

- [ ] Confirm the curated Phoenix firms are accurate and complete
- [ ] Set `google_place_id` on each firm (manual, per T13) so the rating
      sync has something to refresh

## 7. Production smoke test (the full loop)

- [ ] List Your Firm → admin approve → listing live
- [ ] Owner sign-in via magic link (verifies step 2)
- [ ] Upgrade checkout → webhook flips tier to premium
- [ ] Edit premium profile (logo, gallery, practice areas, long bio)
- [ ] Lead form on a premium listing → lands in HighLevel
- [ ] Claim/edit form on an unclaimed listing → appears in `/admin`
