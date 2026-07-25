-- T3: Core schema migration
-- Tables + RLS per docs/ARCHITECTURE.md §4 and §9.
-- Includes the privileged-column guard triggers (firms + profiles) that close
-- the self-approval/self-promotion holes plain RLS can't express.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.city_status as enum ('live', 'coming_soon');
create type public.profile_role as enum ('owner', 'admin');
create type public.firm_status as enum ('pending', 'live', 'rejected', 'suspended');
create type public.firm_tier as enum ('free', 'premium');
create type public.change_request_type as enum ('claim', 'edit');
create type public.change_request_status as enum ('pending', 'highlevel_synced', 'resolved');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  state text not null,
  status public.city_status not null default 'coming_soon',
  hero_image_url text,
  latitude numeric,
  longitude numeric,
  sort_order int not null default 0
);

create table public.practice_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.profile_role not null default 'owner',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table public.firms (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  owner_id uuid references public.profiles (id), -- null = unclaimed/seeded
  status public.firm_status not null default 'pending',
  tier public.firm_tier not null default 'free',
  name text not null,
  slug text not null unique,
  phone text,
  address text,
  website text,
  hours jsonb,
  bio_short text,
  bio_long text,
  logo_url text,
  bar_number text,
  google_place_id text,
  google_rating numeric,
  google_review_count int,
  google_rating_synced_at timestamptz,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index firms_city_status_idx on public.firms (city_id, status);
create index firms_owner_idx on public.firms (owner_id);

create table public.firm_practice_areas (
  firm_id uuid not null references public.firms (id) on delete cascade,
  practice_area_id uuid not null references public.practice_areas (id) on delete cascade,
  primary key (firm_id, practice_area_id)
);

create table public.firm_gallery_images (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0
);

create table public.firm_change_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  type public.change_request_type not null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  message text not null,
  status public.change_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index firm_change_requests_status_idx on public.firm_change_requests (status);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  synced_to_highlevel boolean not null default false,
  created_at timestamptz not null default now()
);

create index leads_firm_idx on public.leads (firm_id);

-- ---------------------------------------------------------------------------
-- Helper: admin check. SECURITY DEFINER so policies on profiles don't
-- recurse (the function reads profiles bypassing RLS as the function owner).
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Guard trigger: privileged columns on firms.
-- Owners may edit their own firm's content fields, but never status, tier,
-- ownership, billing, or the Google cache columns. Admins and the
-- service-role key (webhooks, cron, seeds) are exempt.
-- ---------------------------------------------------------------------------
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

create trigger firms_guard_privileged_columns
  before insert or update on public.firms
  for each row execute function public.guard_firms_privileged_columns();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger firms_set_updated_at
  before update on public.firms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Guard trigger: privileged columns on profiles.
-- role and stripe_customer_id are never user-editable (role = self-promotion
-- hole; stripe_customer_id is set by the Stripe webhook via service role).
-- ---------------------------------------------------------------------------
create or replace function public.guard_profiles_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
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

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profiles_privileged_columns();

-- ---------------------------------------------------------------------------
-- Create a profiles row for every new auth user (magic-link signup).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.cities enable row level security;
alter table public.practice_areas enable row level security;
alter table public.profiles enable row level security;
alter table public.firms enable row level security;
alter table public.firm_practice_areas enable row level security;
alter table public.firm_gallery_images enable row level security;
alter table public.firm_change_requests enable row level security;
alter table public.leads enable row level security;

-- cities / practice_areas: public read, admin write
create policy cities_public_read on public.cities
  for select using (true);
create policy cities_admin_write on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

create policy practice_areas_public_read on public.practice_areas
  for select using (true);
create policy practice_areas_admin_write on public.practice_areas
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: owner reads/updates own row only; trigger above freezes role +
-- stripe_customer_id against self-promotion. No user delete.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- firms: public sees live only; owner sees/edits own rows (any status);
-- owner_id = null (unclaimed) matches no one — the DB-level lockout.
create policy firms_public_read_live on public.firms
  for select using (
    status = 'live' or owner_id = auth.uid() or public.is_admin()
  );
create policy firms_owner_insert on public.firms
  for insert with check (
    (owner_id = auth.uid() and status = 'pending' and tier = 'free')
    or public.is_admin()
  );
create policy firms_owner_update on public.firms
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy firms_admin_delete on public.firms
  for delete using (public.is_admin());

-- firm_practice_areas: public read; write only via parent-firm ownership
create policy fpa_public_read on public.firm_practice_areas
  for select using (true);
create policy fpa_owner_write on public.firm_practice_areas
  for all using (
    exists (
      select 1 from public.firms
      where firms.id = firm_practice_areas.firm_id
        and (firms.owner_id = auth.uid() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.firms
      where firms.id = firm_practice_areas.firm_id
        and (firms.owner_id = auth.uid() or public.is_admin())
    )
  );

-- firm_gallery_images: public read; write only via parent-firm ownership
create policy gallery_public_read on public.firm_gallery_images
  for select using (true);
create policy gallery_owner_write on public.firm_gallery_images
  for all using (
    exists (
      select 1 from public.firms
      where firms.id = firm_gallery_images.firm_id
        and (firms.owner_id = auth.uid() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.firms
      where firms.id = firm_gallery_images.firm_id
        and (firms.owner_id = auth.uid() or public.is_admin())
    )
  );

-- firm_change_requests: anyone (incl. anon) may submit; only admins read/resolve
create policy change_requests_public_insert on public.firm_change_requests
  for insert with check (true);
create policy change_requests_admin_all on public.firm_change_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- leads: anyone (incl. anon) may submit; firm owner reads own firm's leads;
-- admin everything. Sync flag updated via service role only.
create policy leads_public_insert on public.leads
  for insert with check (true);
create policy leads_owner_read on public.leads
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.firms
      where firms.id = leads.firm_id and firms.owner_id = auth.uid()
    )
  );
create policy leads_admin_update on public.leads
  for update using (public.is_admin()) with check (public.is_admin());
create policy leads_admin_delete on public.leads
  for delete using (public.is_admin());
