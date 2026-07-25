-- 0004: tighten public insert policies (pre-launch security audit).
--
-- leads_public_insert and change_requests_public_insert were
-- `with check (true)`, so anonymous callers hitting PostgREST directly
-- bypassed the route-level gates (leads: live + premium firms only;
-- change requests: live firms only). Recreate both with the same
-- predicates the routes enforce. The exists() subqueries work for anon
-- because firms_public_read_live already exposes live firms.
--
-- The app's own routes use the service-role client and are unaffected.

drop policy leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert with check (
    exists (
      select 1 from public.firms
      where firms.id = leads.firm_id
        and firms.status = 'live'
        and firms.tier = 'premium'
    )
  );

drop policy change_requests_public_insert on public.firm_change_requests;
create policy change_requests_public_insert on public.firm_change_requests
  for insert with check (
    exists (
      select 1 from public.firms
      where firms.id = firm_change_requests.firm_id
        and firms.status = 'live'
    )
  );
