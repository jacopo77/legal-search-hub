// T4: Seed script — cities, practice areas, and curated launch firms.
// Run: npm run seed  (reads .env.local via node --env-file)
//
// Uses the service-role key (same env var names as lib/env.ts — this script
// is repo tooling, not feature code, so it can't import the TS accessor).
// Service role bypasses RLS and is exempt from the guard triggers, which is
// what allows inserting firms directly as status=live with owner_id=null
// (unclaimed seeded listings).
//
// Idempotent: everything upserts on slug, and firm practice-area links are
// replaced on each run, so re-running after editing firms.json is safe.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ---------------------------------------------------------------------------
// Cities: Phoenix live at launch; Tucson + Flagstaff as coming_soon
// placeholders (drives /company's Browse-by-City list and the nav selector).
// ---------------------------------------------------------------------------
const CITIES = [
  {
    slug: "phoenix",
    name: "Phoenix",
    state: "AZ",
    status: "live",
    latitude: 33.4484,
    longitude: -112.074,
    sort_order: 1,
  },
  {
    slug: "tucson",
    name: "Tucson",
    state: "AZ",
    status: "coming_soon",
    latitude: 32.2226,
    longitude: -110.9747,
    sort_order: 2,
  },
  {
    slug: "flagstaff",
    name: "Flagstaff",
    state: "AZ",
    status: "coming_soon",
    latitude: 35.1983,
    longitude: -111.6513,
    sort_order: 3,
  },
];

// The 6 launch practice areas (ARCHITECTURE.md §4.2). Admin-extensible later.
const PRACTICE_AREAS = [
  { slug: "family-law", name: "Family Law", sort_order: 1 },
  { slug: "divorce", name: "Divorce", sort_order: 2 },
  { slug: "dui", name: "DUI", sort_order: 3 },
  { slug: "personal-injury", name: "Personal Injury", sort_order: 4 },
  { slug: "estate-planning", name: "Estate Planning", sort_order: 5 },
  { slug: "immigration", name: "Immigration", sort_order: 6 },
  { slug: "business-law", name: "Business Law", sort_order: 7 },
];

async function upsertCities() {
  const { data, error } = await supabase
    .from("cities")
    .upsert(CITIES, { onConflict: "slug" })
    .select("id, slug");
  if (error) throw new Error(`cities upsert failed: ${error.message}`);
  return new Map(data.map((c) => [c.slug, c.id]));
}

async function upsertPracticeAreas() {
  const { data, error } = await supabase
    .from("practice_areas")
    .upsert(PRACTICE_AREAS, { onConflict: "slug" })
    .select("id, slug");
  if (error) throw new Error(`practice_areas upsert failed: ${error.message}`);
  return new Map(data.map((p) => [p.slug, p.id]));
}

// Firms come from firms.json — manually curated from the public AZ State Bar
// directory (see T4). Shape documented in firms.example.json.
function loadFirms() {
  const raw = readFileSync(join(here, "firms.json"), "utf8");
  const firms = JSON.parse(raw);
  if (!Array.isArray(firms)) throw new Error("firms.json must be an array");
  return firms;
}

function validateFirm(firm, index) {
  const where = `firms.json[${index}] (${firm.slug ?? "no slug"})`;
  for (const field of ["name", "slug", "city", "phone", "address"]) {
    if (!firm[field]) throw new Error(`${where}: missing "${field}"`);
  }
  if (!Array.isArray(firm.practice_areas) || firm.practice_areas.length === 0) {
    throw new Error(`${where}: needs at least one practice area`);
  }
  // Free tier = 1 practice area, enforced in application logic at write time
  // (CLAUDE.md data-model rules — the DB will not reject a second row).
  const tier = firm.tier ?? "free";
  if (tier === "free" && firm.practice_areas.length > 1) {
    throw new Error(`${where}: free-tier firms get exactly one practice area`);
  }
}

async function seedFirms(cityIds, practiceAreaIds) {
  const firms = loadFirms();
  if (firms.length === 0) {
    console.log("firms.json is empty — skipping firm seeding");
    return;
  }

  for (const [index, firm] of firms.entries()) {
    validateFirm(firm, index);

    const cityId = cityIds.get(firm.city);
    if (!cityId) throw new Error(`${firm.slug}: unknown city "${firm.city}"`);

    const row = {
      city_id: cityId,
      owner_id: null, // seeded = unclaimed
      status: "live", // curated batch goes straight to live per T4
      tier: firm.tier ?? "free",
      name: firm.name,
      slug: firm.slug,
      phone: firm.phone,
      address: firm.address,
      website: firm.website ?? null,
      hours: firm.hours ?? null,
      bio_short: firm.bio_short ?? null,
      bar_number: firm.bar_number ?? null,
      google_place_id: firm.google_place_id ?? null,
    };

    const { data: upserted, error } = await supabase
      .from("firms")
      .upsert(row, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`${firm.slug}: upsert failed: ${error.message}`);

    // Replace practice-area links so re-runs converge with firms.json.
    const links = firm.practice_areas.map((slug) => {
      const practiceAreaId = practiceAreaIds.get(slug);
      if (!practiceAreaId) {
        throw new Error(`${firm.slug}: unknown practice area "${slug}"`);
      }
      return { firm_id: upserted.id, practice_area_id: practiceAreaId };
    });
    const { error: deleteError } = await supabase
      .from("firm_practice_areas")
      .delete()
      .eq("firm_id", upserted.id);
    if (deleteError) {
      throw new Error(`${firm.slug}: link reset failed: ${deleteError.message}`);
    }
    const { error: linkError } = await supabase
      .from("firm_practice_areas")
      .insert(links);
    if (linkError) {
      throw new Error(`${firm.slug}: link insert failed: ${linkError.message}`);
    }

    console.log(`  ✓ ${firm.name} (${row.tier}, ${links.length} practice area(s))`);
  }
  console.log(`Seeded ${firms.length} firm(s)`);
}

const cityIds = await upsertCities();
console.log(`Cities: ${[...cityIds.keys()].join(", ")}`);
const practiceAreaIds = await upsertPracticeAreas();
console.log(`Practice areas: ${[...practiceAreaIds.keys()].join(", ")}`);
await seedFirms(cityIds, practiceAreaIds);
