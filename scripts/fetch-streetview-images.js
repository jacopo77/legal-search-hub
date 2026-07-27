#!/usr/bin/env node

/**
 * Fetch Google Street View Static API images for each firm's address and
 * save them to public/firms/[slug].jpg (same convention as
 * scrape-firm-images.js), replacing the current listing image.
 *
 * Two-phase by design — nothing is written to the database until reviewed:
 *
 *   node scripts/fetch-streetview-images.js
 *     Fetches + saves images only. Prints a report. No DB writes.
 *
 *   node scripts/fetch-streetview-images.js --apply
 *     Re-reads the same report logic and sets firms.logo_url for every
 *     firm whose image was saved successfully. Pass --skip=slug1,slug2 to
 *     exclude firms flagged as unusable during review.
 *
 * Reads the Street View key only from process.env.GOOGLE_STREETVIEW_API_KEY
 * — never hardcoded, never logged.
 */

"use strict";

process.loadEnvFile(".env.local");

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const PUBLIC_FIRMS_DIR = path.join(__dirname, "..", "public", "firms");
const IMAGE_SIZE = "640x400";
const OUTPUT_QUALITY = 85;
const MAX_OUTPUT_WIDTH = 1600;
const REQUEST_TIMEOUT_MS = 15000;

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const skipArg = argv.find((a) => a.startsWith("--skip="));
  const skip = new Set(
    skipArg ? skipArg.slice("--skip=".length).split(",").filter(Boolean) : [],
  );
  return { apply, skip };
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

async function checkMetadata(address, apiKey) {
  const url =
    `https://maps.googleapis.com/maps/api/streetview/metadata` +
    `?size=${IMAGE_SIZE}&location=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`metadata HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchImage(address, apiKey) {
  const url =
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=${IMAGE_SIZE}&location=${encodeURIComponent(address)}&fov=90&pitch=0&key=${apiKey}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`image HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function saveJpeg(slug, buffer) {
  const outputPath = path.join(PUBLIC_FIRMS_DIR, `${slug}.jpg`);
  await sharp(buffer)
    .resize(MAX_OUTPUT_WIDTH, undefined, { withoutEnlargement: true })
    .jpeg({ quality: OUTPUT_QUALITY, progressive: true })
    .toFile(outputPath);
  return outputPath;
}

async function main() {
  const { apply, skip } = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const streetViewKey = process.env.GOOGLE_STREETVIEW_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY are set in .env.local.",
    );
    process.exit(1);
  }
  if (!streetViewKey) {
    console.error(
      "Missing GOOGLE_STREETVIEW_API_KEY in .env.local — required to call " +
        "the Street View Static API.",
    );
    process.exit(1);
  }

  fs.mkdirSync(PUBLIC_FIRMS_DIR, { recursive: true });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: firms, error } = await supabase
    .from("firms")
    .select("id, slug, name, address, logo_url")
    .order("name");

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    process.exit(1);
  }
  if (!firms || firms.length === 0) {
    console.log("No firms found.");
    return;
  }

  const missingAddress = firms.filter((f) => !f.address);
  if (missingAddress.length > 0) {
    console.log("Firms missing an address (needs manual lookup first):");
    for (const f of missingAddress) console.log(`  - ${f.name} (${f.slug})`);
  }
  const withAddress = firms.filter((f) => f.address);

  console.log(
    `${firms.length} firms total, ${withAddress.length} with an address. ` +
      `Starting Street View fetch...\n`,
  );

  const results = [];

  for (const firm of withAddress) {
    const prefix = `[${firm.slug}] ${firm.name}`;

    if (apply && skip.has(firm.slug)) {
      console.log(`${prefix}: skipped (--skip)`);
      results.push({ firm, status: "skipped-by-flag" });
      continue;
    }

    try {
      const metadata = await checkMetadata(firm.address, streetViewKey);
      if (metadata.status !== "OK") {
        console.log(
          `${prefix}: no Street View imagery (${metadata.status}) — needs manual sourcing`,
        );
        results.push({ firm, status: "unavailable", apiStatus: metadata.status });
        continue;
      }

      if (!apply) {
        const buffer = await fetchImage(firm.address, streetViewKey);
        const outputPath = await saveJpeg(firm.slug, buffer);
        console.log(`${prefix}: saved → ${outputPath}`);
        results.push({
          firm,
          status: "saved",
          path: outputPath,
          panoDate: metadata.date,
        });
      } else {
        results.push({ firm, status: "saved" });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`${prefix}: error — ${reason}`);
      results.push({ firm, status: "error", reason });
    }

    // Small polite delay between requests.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log("\n--- Summary ---");
  const saved = results.filter((r) => r.status === "saved");
  const unavailable = results.filter((r) => r.status === "unavailable");
  const errored = results.filter((r) => r.status === "error");
  console.log(`Saved:       ${saved.length}/${withAddress.length}`);
  console.log(`Unavailable: ${unavailable.length}/${withAddress.length}`);
  console.log(`Errors:      ${errored.length}/${withAddress.length}`);

  if (!apply) {
    console.log(
      "\nDry run only — no database changes made. Review the saved images " +
        "in public/firms/, then re-run with --apply (optionally --skip=" +
        "slug1,slug2) to update firms.logo_url.",
    );
    return;
  }

  console.log("\nApplying logo_url updates...");
  for (const r of saved) {
    const logoUrl = `/firms/${r.firm.slug}.jpg`;
    const { error: updateError } = await supabase
      .from("firms")
      .update({ logo_url: logoUrl })
      .eq("id", r.firm.id);
    if (updateError) {
      console.log(`  ✗ ${r.firm.slug}: update failed — ${updateError.message}`);
    } else {
      console.log(`  ✓ ${r.firm.slug}: logo_url = ${logoUrl}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
