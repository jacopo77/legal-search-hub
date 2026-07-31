#!/usr/bin/env node

/**
 * Match firms without a google_place_id to a Google Place via Places API
 * (New) Text Search, using each firm's name + exact address as the query.
 *
 * Two-phase by design — nothing is written to the database until reviewed:
 *
 *   node scripts/match-google-places.js
 *     Searches only. Writes a report to scripts/place-match-report.json and
 *     prints a summary + flags any match whose returned name/address looks
 *     like it might not be the same business. No DB writes.
 *
 *   node scripts/match-google-places.js --apply
 *     Re-reads the same report and sets firms.google_place_id,
 *     google_rating, google_review_count, and google_rating_synced_at for
 *     every non-flagged match. Pass --skip=slug1,slug2 to exclude specific
 *     firms, and --include-flagged to also apply the ones flagged for
 *     review (only after you've actually looked at them).
 *
 * Reads the key only from process.env.GOOGLE_PLACES_API_KEY — never
 * hardcoded, never logged.
 */

"use strict";

process.loadEnvFile(".env.local");

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const REPORT_PATH = path.join(__dirname, "place-match-report.json");
const REQUEST_TIMEOUT_MS = 15000;

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const includeFlagged = argv.includes("--include-flagged");
  const skipArg = argv.find((a) => a.startsWith("--skip="));
  const skip = new Set(
    skipArg ? skipArg.slice("--skip=".length).split(",").filter(Boolean) : [],
  );
  return { apply, skip, includeFlagged };
}

async function fetchWithTimeout(url, opts) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchText(query, apiKey) {
  const res = await fetchWithTimeout("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "US" }),
  });
  if (!res.ok) {
    throw new Error(`Places API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Loose heuristic: does the returned place's name share meaningful words
// with our firm name? Not a guarantee of correctness — just a signal to
// flag matches worth a human glance before trusting them.
function looksLikeSameBusiness(ourName, theirName) {
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[.,]/g, "")
      .replace(/\b(llp|pllc|plc|pc|llc|inc|the|law|firm|offices?|group|attorneys?|associates?)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const a = norm(ourName);
  const b = norm(theirName);
  if (!a || !b) return false;
  const aWords = new Set(a.split(" ").filter((w) => w.length > 2));
  const bWords = new Set(b.split(" ").filter((w) => w.length > 2));
  if (aWords.size === 0) return false;
  let overlap = 0;
  for (const w of aWords) if (bWords.has(w)) overlap++;
  return overlap / aWords.size >= 0.5;
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
      (r) => r.matched && (includeFlagged || !r.flagged) && !skip.has(r.slug),
    );
    console.log(`Applying ${toApply.length} match(es)...`);
    const now = new Date().toISOString();
    for (const r of toApply) {
      const { error } = await supabase
        .from("firms")
        .update({
          google_place_id: r.place_id,
          google_rating: r.rating,
          google_review_count: r.review_count,
          google_rating_synced_at: now,
        })
        .eq("slug", r.slug);
      if (error) {
        console.log(`  ✗ ${r.slug}: ${error.message}`);
      } else {
        console.log(`  ✓ ${r.slug}: place_id=${r.place_id}, rating=${r.rating} (${r.review_count} reviews)`);
      }
    }
    return;
  }

  const { data: firms, error } = await supabase
    .from("firms")
    .select("id, slug, name, address")
    .is("google_place_id", null)
    .not("address", "is", null)
    .order("name");

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    process.exit(1);
  }
  if (!firms || firms.length === 0) {
    console.log("No firms need matching.");
    return;
  }

  console.log(`${firms.length} firms without a google_place_id. Searching...\n`);

  const report = [];
  for (const firm of firms) {
    const query = `${firm.name}, ${firm.address}`;
    try {
      const result = await searchText(query, placesKey);
      const candidate = result.places?.[0];
      if (!candidate) {
        console.log(`[${firm.slug}] ${firm.name}: no match found`);
        report.push({ slug: firm.slug, name: firm.name, address: firm.address, matched: false });
        continue;
      }
      const theirName = candidate.displayName?.text ?? "";
      const flagged = !looksLikeSameBusiness(firm.name, theirName);
      console.log(
        `[${firm.slug}] ${firm.name}${flagged ? "  ⚠ FLAGGED" : ""}\n` +
          `    → "${theirName}" @ ${candidate.formattedAddress}\n` +
          `    rating=${candidate.rating ?? "—"} reviews=${candidate.userRatingCount ?? "—"}`,
      );
      report.push({
        slug: firm.slug,
        name: firm.name,
        address: firm.address,
        matched: true,
        flagged,
        matched_name: theirName,
        matched_address: candidate.formattedAddress,
        place_id: candidate.id,
        rating: candidate.rating ?? null,
        review_count: candidate.userRatingCount ?? null,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`[${firm.slug}] ${firm.name}: error — ${reason}`);
      report.push({ slug: firm.slug, name: firm.name, address: firm.address, matched: false, error: reason });
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const matched = report.filter((r) => r.matched);
  const flagged = matched.filter((r) => r.flagged);
  const clean = matched.filter((r) => !r.flagged);
  const noMatch = report.filter((r) => !r.matched);

  console.log("\n--- Summary ---");
  console.log(`Clean matches:   ${clean.length}`);
  console.log(`Flagged (review): ${flagged.length}`);
  console.log(`No match/error:  ${noMatch.length}`);
  console.log(`\nReport written to ${REPORT_PATH}`);
  console.log(
    "Dry run only — no database changes made. Review the report, then re-run " +
      "with --apply (clean matches only by default; add --include-flagged " +
      "to also apply flagged ones after reviewing them).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
