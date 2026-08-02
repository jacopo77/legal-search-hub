#!/usr/bin/env node

/**
 * Geocode firms without stored coordinates via Google's Geocoding API, using
 * each firm's own address text. Backs the ZIP/location filter on the All
 * Firms page (firms.latitude/longitude, migration 0008).
 *
 * Two-phase by design, same convention as match-google-places.js and
 * fetch-firm-bios.js -- nothing is written to the database until reviewed:
 *
 *   node scripts/geocode-firms.js
 *     Geocodes only. Writes a report to scripts/geocode-report.json and
 *     flags any result with a low-precision location_type (APPROXIMATE --
 *     Google could only resolve to a city/ZIP centroid, not the actual
 *     address) or whose returned state isn't AZ. No DB writes.
 *
 *   node scripts/geocode-firms.js --apply
 *     Re-reads the same report and sets firms.latitude/longitude for every
 *     non-flagged result. Pass --skip=slug1,slug2 to exclude specific
 *     firms, and --include-flagged to also apply the flagged ones (only
 *     after you've actually looked at them).
 *
 * Reads the key only from process.env.GOOGLE_PLACES_API_KEY (same key
 * already used for Places Text Search -- Geocoding API is enabled on the
 * same Google Cloud project) -- never hardcoded, never logged.
 */

"use strict";

process.loadEnvFile(".env.local");

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const REPORT_PATH = path.join(__dirname, "geocode-report.json");
const REQUEST_TIMEOUT_MS = 10000;

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const includeFlagged = argv.includes("--include-flagged");
  const skipArg = argv.find((a) => a.startsWith("--skip="));
  const skip = new Set(
    skipArg ? skipArg.slice("--skip=".length).split(",").filter(Boolean) : [],
  );
  return { apply, skip, includeFlagged };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function geocode(address, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`Geocoding API HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.status !== "OK") {
    throw new Error(`Geocoding API status ${json.status}`);
  }
  return json.results[0];
}

function stateShortName(result) {
  const component = result.address_components.find((c) =>
    c.types.includes("administrative_area_level_1"),
  );
  return component?.short_name ?? null;
}

async function main() {
  const { apply, skip, includeFlagged } = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase credentials in .env.local.");
    process.exit(1);
  }
  if (!placesKey) {
    console.error("Missing GOOGLE_PLACES_API_KEY in .env.local.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (apply) {
    if (!fs.existsSync(REPORT_PATH)) {
      console.error("No report found — run without --apply first.");
      process.exit(1);
    }
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
    const toApply = report.filter(
      (r) => r.geocoded && (includeFlagged || !r.flagged) && !skip.has(r.slug),
    );
    console.log(`Applying ${toApply.length} coordinate(s)...`);
    for (const r of toApply) {
      const { error } = await supabase
        .from("firms")
        .update({ latitude: r.latitude, longitude: r.longitude })
        .eq("slug", r.slug);
      if (error) {
        console.log(`  ✗ ${r.slug}: ${error.message}`);
      } else {
        console.log(`  ✓ ${r.slug}: ${r.latitude}, ${r.longitude}`);
      }
    }
    return;
  }

  // The latitude filter only works once migration 0008 has been applied;
  // this script is meant to be run (dry-run only) before that too, so fall
  // back to an unfiltered query if the column doesn't exist yet.
  let { data: firms, error } = await supabase
    .from("firms")
    .select("id, slug, name, address")
    .is("latitude", null)
    .not("address", "is", null)
    .order("name");
  if (error?.message?.includes("latitude does not exist")) {
    console.log(
      "Note: firms.latitude doesn't exist yet (migration 0008 not applied) " +
        "— geocoding every firm with an address instead of only the unfilled ones.\n",
    );
    ({ data: firms, error } = await supabase
      .from("firms")
      .select("id, slug, name, address")
      .not("address", "is", null)
      .order("name"));
  }

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    process.exit(1);
  }
  if (!firms || firms.length === 0) {
    console.log("No firms need geocoding.");
    return;
  }

  console.log(`${firms.length} firms without coordinates. Geocoding...\n`);

  const report = [];
  for (const firm of firms) {
    try {
      const result = await geocode(firm.address, placesKey);
      const state = stateShortName(result);
      const flagged =
        result.geometry.location_type === "APPROXIMATE" || state !== "AZ";
      console.log(
        `[${firm.slug}] ${firm.name}${flagged ? "  ⚠ FLAGGED" : ""}\n` +
          `    → ${result.formatted_address}\n` +
          `    ${result.geometry.location.lat}, ${result.geometry.location.lng} (${result.geometry.location_type})`,
      );
      report.push({
        slug: firm.slug,
        name: firm.name,
        address: firm.address,
        geocoded: true,
        flagged,
        formatted_address: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        location_type: result.geometry.location_type,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`[${firm.slug}] ${firm.name}: error — ${reason}`);
      report.push({
        slug: firm.slug,
        name: firm.name,
        address: firm.address,
        geocoded: false,
        error: reason,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const geocoded = report.filter((r) => r.geocoded);
  const flagged = geocoded.filter((r) => r.flagged);
  const clean = geocoded.filter((r) => !r.flagged);
  const failed = report.filter((r) => !r.geocoded);

  console.log("\n--- Summary ---");
  console.log(`Clean:   ${clean.length}`);
  console.log(`Flagged: ${flagged.length}`);
  console.log(`Failed:  ${failed.length}`);
  console.log(`\nReport written to ${REPORT_PATH}`);
  console.log(
    "Dry run only — no database changes made. Review the report, then " +
      "re-run with --apply (clean results only by default; add " +
      "--include-flagged to also apply flagged ones after reviewing them).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
