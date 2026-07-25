-- T11 follow-up: fix guard triggers for non-PostgREST callers.
--
-- 0001's guard triggers exempted only auth.role() = 'service_role'. But
-- auth.role() is NULL when SQL runs outside PostgREST — the dashboard SQL
-- editor, the Management API query endpoint, migrations. Those are all
-- privileged contexts (only someone with the service key / dashboard access
-- can reach them), yet the triggers treated them as untrusted callers:
-- seeding a firm as live via SQL was silently coerced to pending/free
-- (discovered while seeding T11 test firms).
--
-- Fix: exempt NULL auth.role() alongside service_role. The only callers who
-- reach these tables with a NON-null role are PostgREST requests (anon /
-- authenticated / service_role), and RLS already gates anon; authenticated
-- non-admins still get coerced/blocked exactly as before.

create or replace function public.guard_firms_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Privileged: service-role API key, or any direct-SQL context (dashboard
  -- SQL editor, Management API, migrations) where auth.role() is null.
  if auth.role() is null or auth.role() = 'service_role' or public.is_admin() then
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
  then
    raise exception 'firms: status, tier, ownership, billing, and google_* columns are admin/service-only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.guard_profiles_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is null or auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.stripe_customer_id is distinct from old.stripe_customer_id
  then
    raise exception 'profiles: role and stripe_customer_id are admin/service-only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
