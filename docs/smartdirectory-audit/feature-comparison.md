# SmartDirectoryAI feature audit

Goal: mine SmartDirectoryAI for productive features worth adding to Legal
Search Hub. Source: their public product pages (smartdirectory.ai — note
smartdirectoryai.com is a parked GoDaddy domain). Dashboard-level detail
(claim flow UX, theme editor, admin ergonomics) still needs user-supplied
screenshots to fill in.

## The key structural finding

**SmartDirectoryAI is a directory theme layered on GoHighLevel.** Its
feature list is HighLevel's verbatim: sub-accounts, workflow automations,
trigger links, 2-way SMS, missed-call-text-back, GMB messaging, CRM
pipelines, email marketing, funnels, documents/contracts, QR codes.

We already integrate HighLevel (lib/highlevel.ts, four triggers) and the
user already pays for a HighLevel account. **Most of SmartDirectoryAI's
"platform" is configure-not-code for us** — the features live in the
user's existing HighLevel subscription and need workflow setup there, not
application code here.

## Mapping

### Already in v1 (built)
- Free + premium listing tiers, premium featured placement
- Listing claim flow (T17), free self-serve signup (T14)
- Categories (practice areas), search + filtering (T11)
- Lead capture on premium listings (T21)
- CRM sync of all four lifecycle events (T15/T14/T17/T19/T21)
- Premium listing editing (T20), mobile-ready responsive design
- SEO: per-page metadata, JSON-LD, sitemap (T22) — SmartDirectoryAI
  doesn't even advertise SEO features

### Already in the user's HighLevel account (configure, don't build)
- CRM pipelines + opportunities (we already create opportunities on
  premium checkout)
- 2-way SMS/email conversations with firms and leads
- Email marketing + templates (nurture sequences for signups)
- Missed-call-text-back, web chat, FB/GMB messaging
- Reputation management, social planner
- Workflow automations, trigger links, call tracking
- Funnels, QR codes, documents/contracts, surveys/quizzes
- Booking/calendar (if firms want consultation scheduling)

### Already planned in Phase 2 (docs/TASKS.md)
- Blog / legal news content section
- Sponsored ad placement
- Additional cities (our cities-as-rows architecture is the equivalent
  of their multi-site installs, but cleaner)

### Genuinely new — evaluated

| Feature | What it is | Fit for us | Recommendation |
|---|---|---|---|
| **AI inbound agent** (helps businesses claim listings, upsells premium, books calls) | HighLevel Conversation AI on the claim/signup channel | High — claim conversion and premium upsell are our funnel | **Configure in HighLevel** (Conversation AI), no app code. Evaluate after launch with real claim volume |
| **Outbound AI dialer** (calls business owners, offers upgrades) | HighLevel voice AI | Medium — sales tool, not product feature | **Configure in HighLevel** if outbound sales is part of the launch plan |
| **Bulk lead/firm import** (100–1,000/mo) | CSV-driven seeding at scale | High — this is how new cities launch | **Partially built**: T4 shipped a CSV template + seed script. Extend the seed script for batch city imports when Tucson/Flagstaff go live (Phase 2) |
| **Events / job postings / news feed** | Extra content types beside listings | Medium — engagement + SEO surface, but a moderation burden | Phase 3 candidate; revisit after the Phase 2 blog proves content ops |
| **Memberships / communities / certificates** | Paid member areas | Low — weak fit for an attorney directory | Skip |
| **Affiliate manager** | Referral tracking for partners | Medium — local news outlets / bar associations could refer | Phase 3 candidate alongside sponsored placements |
| **Text-to-pay** | HighLevel payments via SMS | Low for us (Stripe subscriptions, not one-off invoices) | Skip |

## Adjustments adopted

1. **No new app code pre-launch.** Everything high-fit is either built or
   a HighLevel configuration task.
2. **New launch-checklist item**: configure the HighLevel workflows for
   the four trigger tags (already in docs/LAUNCH.md step 4) — this *is*
   the SmartDirectoryAI feature parity work.
3. **Post-launch (Phase 2) planning additions**, to be confirmed against
   real usage:
   - HighLevel Conversation AI on the claim/signup nurture path
   - Bulk-import mode for the seed script when expanding cities
   - Events/jobs content types — only if the blog proves content ops
4. **Dashboard pass deferred**: if dashboard screenshots arrive, append
   UX-level notes here (claim flow, theme editor, admin ergonomics) —
   unlikely to change the conclusions above.
