-- 0005: city-parameterized hero copy + local hero image.
--
-- The redesign gives each city a custom hero headline/subtext — copy lives
-- in the cities row, never in the Hero component (CLAUDE.md rule 1). The
-- hero image moves from Supabase Storage to a local public/ asset (the
-- Phoenix skyline photo) — a plain path, no bucket round-trip.

alter table public.cities
  add column hero_headline text,
  add column hero_subtext text;

update public.cities
set hero_headline = 'Find Phoenix Attorneys You Can Trust',
    hero_subtext = 'Find the right Phoenix attorney by name, practice area, or keyword',
    hero_image_url = '/business_1784406884033.jpg'
where slug = 'phoenix';
