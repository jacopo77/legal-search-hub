#!/usr/bin/env node

/**
 * Auto-pull a short bio for firms that have none, from their own website's
 * <meta name="description"> tag — the firm's own public self-description,
 * not fabricated copy. Same two-phase pattern as fetch-streetview-images.js:
 * nothing is written to the database until reviewed.
 *
 *   node scripts/fetch-firm-bios.js
 *     Fetches candidate descriptions only. Prints a report. No DB writes.
 *
 *   node scripts/fetch-firm-bios.js --apply
 *     Re-fetches and sets firms.bio_short for every firm whose description
 *     passed the quality checks. Pass --skip=slug1,slug2 to exclude firms
 *     flagged as unusable during review.
 *
 * Honest limitation, confirmed empirically on a sample: not every firm's
 * site is reachable this way. Some sites block non-browser requests (403 —
 * WAF/Cloudflare bot protection is common on law-firm marketing sites), and
 * some simply have no meta description. Firms that fail here are exactly
 * the list that needs the manual-outreach path instead — the "Failed"
 * section of the report is that list, not a bug.
 */

"use strict";

process.loadEnvFile(".env.local");

const { createClient } = require("@supabase/supabase-js");

const REQUEST_TIMEOUT_MS = 8000;
const MIN_DESCRIPTION_LENGTH = 40;
const MAX_BIO_LENGTH = 300;
// Real browser UA — several firm sites 403 the default Node fetch UA
// (identified as a bot by WAF/Cloudflare) but allow a normal browser UA.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Handles both attribute orders (name before content, or content before
// name) and either quote style — real-world markup isn't consistent here.
function extractMetaDescription(html) {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// HTML entity decoding — meta content commonly carries &amp;, &#039;,
// &mdash;, etc. Numeric entities (decimal and hex) are decoded generically
// rather than hand-listed, since real-world CMS output varies (seen both
// &#39; and &#039; for an apostrophe across different firm sites).
function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateAtWordBoundary(text, maxLength) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

async function main() {
  const { apply, skip } = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY are set in .env.local.",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: firms, error } = await supabase
    .from("firms")
    .select("id, slug, name, website")
    .is("bio_short", null)
    .is("bio_long", null)
    .not("website", "is", null)
    .order("name");

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    process.exit(1);
  }
  if (!firms || firms.length === 0) {
    console.log("No bio-less firms with a website found.");
    return;
  }

  console.log(
    `${firms.length} bio-less firms with a website. Starting fetch...\n`,
  );

  const results = [];

  for (const firm of firms) {
    const prefix = `[${firm.slug}] ${firm.name}`;

    if (apply && skip.has(firm.slug)) {
      console.log(`${prefix}: skipped (--skip)`);
      results.push({ firm, status: "skipped-by-flag" });
      continue;
    }

    try {
      const res = await fetchWithTimeout(firm.website);
      if (!res.ok) {
        console.log(`${prefix}: HTTP ${res.status} — needs manual outreach`);
        results.push({ firm, status: "failed", reason: `HTTP ${res.status}` });
        continue;
      }
      const html = await res.text();
      const raw = extractMetaDescription(html);
      if (!raw) {
        console.log(`${prefix}: no meta description — needs manual outreach`);
        results.push({ firm, status: "failed", reason: "no meta description" });
        continue;
      }
      const decoded = decodeEntities(raw);
      if (decoded.length < MIN_DESCRIPTION_LENGTH) {
        console.log(
          `${prefix}: description too short (${decoded.length} chars) — needs manual outreach`,
        );
        results.push({ firm, status: "failed", reason: "too short" });
        continue;
      }
      const bio = truncateAtWordBoundary(decoded, MAX_BIO_LENGTH);
      console.log(`${prefix}: "${bio}"`);
      results.push({ firm, status: "found", bio });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`${prefix}: error — ${reason}`);
      results.push({ firm, status: "error", reason });
    }

    // Small polite delay between requests.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log("\n--- Summary ---");
  const found = results.filter((r) => r.status === "found");
  const failed = results.filter(
    (r) => r.status === "failed" || r.status === "error",
  );
  console.log(`Found:  ${found.length}/${firms.length}`);
  console.log(`Failed: ${failed.length}/${firms.length} (needs manual outreach)`);

  if (failed.length > 0) {
    console.log("\nFailed (candidates for the manual-outreach list):");
    for (const r of failed) {
      console.log(`  - ${r.firm.name} (${r.firm.slug}): ${r.reason}`);
    }
  }

  if (!apply) {
    console.log(
      "\nDry run only — no database changes made. Review the descriptions " +
        "above, then re-run with --apply (optionally --skip=slug1,slug2) " +
        "to update firms.bio_short.",
    );
    return;
  }

  console.log("\nApplying bio_short updates...");
  for (const r of found) {
    const { error: updateError } = await supabase
      .from("firms")
      .update({ bio_short: r.bio })
      .eq("id", r.firm.id);
    if (updateError) {
      console.log(`  ✗ ${r.firm.slug}: update failed — ${updateError.message}`);
    } else {
      console.log(`  ✓ ${r.firm.slug}: bio_short set`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
