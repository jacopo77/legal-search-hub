-- 0007: saved_firms -- a signed-in user's bookmarked/shortlisted firms
-- (Feature Gap #4, UX review 2026-07-31). Pure toggle table: insert to
-- save, delete to unsave, no update case ever needed. Signed-out visitors
-- save to localStorage instead (see lib/saved-firms.ts) -- this table only
-- backs the signed-in path, with no merge between the two in v1.

create table public.saved_firms (
  user_id uuid not null references public.profiles (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, firm_id)
);

-- No separate index: the composite PK's leading column (user_id) already
-- serves the "list what I've saved" query.

alter table public.saved_firms enable row level security;

create policy saved_firms_select_own on public.saved_firms
  for select using (user_id = auth.uid());
create policy saved_firms_insert_own on public.saved_firms
  for insert with check (user_id = auth.uid());
create policy saved_firms_delete_own on public.saved_firms
  for delete using (user_id = auth.uid());
