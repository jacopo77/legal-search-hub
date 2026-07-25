-- T11: Search support — pg_trgm, full-text vector on firms, search RPC.
-- Per ARCHITECTURE.md §8: tsvector over name + bio_short (+ practice-area
-- name matched via the join table in the RPC), trigram for typo tolerance,
-- always city-scoped, live firms only.

create extension if not exists pg_trgm;

alter table public.firms
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A')
    || setweight(to_tsvector('english', coalesce(bio_short, '')), 'B')
  ) stored;

create index firms_search_vector_idx on public.firms using gin (search_vector);
create index firms_name_trgm_idx on public.firms using gin (name gin_trgm_ops);

-- City-scoped firm search. Ranked by full-text rank + trigram name
-- similarity; a firm also matches when one of its practice areas matches the
-- query text. RLS still applies to the returned rows (function runs as the
-- caller); the status filter is restated here so the query layer owns it.
create or replace function public.search_firms(p_city_id uuid, p_query text)
returns setof public.firms
language sql
stable
set search_path = public
as $$
  select f.*
  from public.firms f
  where f.city_id = p_city_id
    and f.status = 'live'
    and (
      f.search_vector @@ plainto_tsquery('english', p_query)
      -- word_similarity (not plain similarity): compares the query against
      -- the best-matching segment of the name, so a short query like
      -- "smiths" matches "Smith & Jones Family Law". Catches dropped/extra
      -- characters; single-letter substitutions in short words score too
      -- low for the 0.3 default threshold — that's pg_trgm's nature.
      or p_query <% f.name
      or exists (
        select 1
        from public.firm_practice_areas fpa
        join public.practice_areas pa on pa.id = fpa.practice_area_id
        where fpa.firm_id = f.id
          and pa.name ilike '%' || p_query || '%'
      )
    )
  order by (
    ts_rank(f.search_vector, plainto_tsquery('english', p_query))
    + word_similarity(p_query, f.name)
  ) desc, f.name asc;
$$;
