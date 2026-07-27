-- 0006: CLAIM / PREMIUM listing badges (docs/DESIGN-BADGES.md).
--
-- Both flags are display-only overrides, not new sources of truth:
--   - CLAIM badge visibility is derived from owner_id IS NULL; this column
--     only lets an admin suppress it early.
--   - PREMIUM badge is independent of billing `tier` (badge = marketing
--     display, tier = actual premium features/entitlements) but is kept in
--     sync by the Stripe webhook, with the admin toggle as an override.
--
-- Both are privileged columns: appended to the firms guard trigger's
-- admin/service-role-only list, same as status/tier/owner_id.

alter table public.firms
  add column claim_badge_hidden boolean not null default false,
  add column premium_badge boolean not null default false;

create or replace function public.guard_firms_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Self-serve signups are always free + pending, owned by the caller.
    -- Coerce rather than reject: the app inserts these values anyway, and a
    -- crafted insert attempting self-publish is silently neutralized.
    new.status := 'pending';
    new.tier := 'free';
    new.owner_id := auth.uid();
    new.stripe_subscription_id := null;
    new.google_place_id := null;
    new.google_rating := null;
    new.google_review_count := null;
    new.google_rating_synced_at := null;
    new.claim_badge_hidden := false;
    new.premium_badge := false;
    return new;
  end if;

  -- UPDATE
  if new.status is distinct from old.status
     or new.tier is distinct from old.tier
     or new.owner_id is distinct from old.owner_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.google_place_id is distinct from old.google_place_id
     or new.google_rating is distinct from old.google_rating
     or new.google_review_count is distinct from old.google_review_count
     or new.google_rating_synced_at is distinct from old.google_rating_synced_at
     or new.claim_badge_hidden is distinct from old.claim_badge_hidden
     or new.premium_badge is distinct from old.premium_badge
  then
    raise exception 'firms: status, tier, ownership, billing, google_*, and badge columns are admin/service-only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
