-- 0008: firm coordinates -- lat/lng backfilled via Google Geocoding API
-- (scripts/geocode-firms.js) to support the ZIP/location filter on the All
-- Firms page (UX review Feature Gap #1). Mirrors cities.latitude/longitude's
-- column types (0001_core_schema.sql:26-27); nullable, since not every firm
-- will geocode cleanly (bad/partial address data) and the app must keep
-- working for firms with no coordinates -- they just don't participate in
-- the location filter.

alter table public.firms
  add column latitude numeric,
  add column longitude numeric;
