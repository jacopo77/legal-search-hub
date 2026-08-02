#!/usr/bin/env node

/**
 * Backfill bio_short/bio_long from each firm's own About page, not just the
 * homepage <meta name="description"> tag (see fetch-firm-bios.js, whose
 * meta-description approach turned out too thin on review -- every one of
 * its 8 "found" results had a real quality problem: mid-sentence
 * truncation, or prose describing an entirely different brand name).
 *
 * Approach: fetch the homepage, look for a link to an About-ish page
 * (href/text containing "about"), fetch that page if found (falls back to
 * the homepage itself for small sites with no separate About page), then
 * pull the first few real <p> paragraphs from its main content area --
 * paragraphs, not the whole flattened page text, so staff bios/testimonials
 * further down the page don't bleed into the summary.
 *
 * Flags (for human review, not auto-rejected) when none of the firm's own
 * distinctive name words appear anywhere in the extracted text -- the same
 * smell test as match-google-places.js's looksLikeSameBusiness, adapted for
 * prose instead of a single business-name field. This is exactly what would
 * have caught the Sweet James / Clark Hill rebrand mismatches automatically.
 *
 * Two-phase, same convention as fetch-firm-bios.js / match-google-places.js:
 *
 *   node scripts/scrape-firm-about.js
 *     Scrapes only. Writes scripts/about-scrape-report.json. No DB writes.
 *
 *   node scripts/scrape-firm-about.js --apply
 *     Re-reads the report and sets firms.bio_short + firms.bio_long for
 *     every non-flagged result. Pass --skip=slug1,slug2 to exclude specific
 *     firms, and --include-flagged to also apply flagged ones after
 *     reviewing them.
 */

"use strict";

process.loadEnvFile(".env.local");

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { parse } = require("node-html-parser");

const REPORT_PATH = path.join(__dirname, "about-scrape-report.json");
const REQUEST_TIMEOUT_MS = 10000;
const MIN_PARAGRAPH_LENGTH = 30;
const BIO_SHORT_MAX = 280;
const BIO_LONG_MAX = 1200;
// Real browser UA -- several firm sites 403 the default Node fetch UA
// (confirmed in fetch-firm-bios.js's run) but allow a normal browser UA.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const NOISE_TAGS = ["script", "style", "noscript", "nav", "header", "footer", "svg", "form", "iframe"];
const JUNK_MARKERS = [
  "enable javascript",
  "page not found",
  "404",
  "access denied",
  "just a moment",
];

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const includeFlagged = argv.includes("--include-flagged");
  const skipArg = argv.find((a) => a.startsWith("--skip="));
  const skip = new Set(
    skipArg ? skipArg.slice("--skip=".length).split(",").filter(Boolean) : [],
  );
  return { apply, skip, includeFlagged };
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

// Same generic entity decoding as fetch-firm-bios.js -- real-world CMS
// output varies (seen both &#39; and &#039; for an apostrophe across
// different firm sites), so numeric entities are decoded generically
// rather than hand-listed.
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

// Looks for a link whose href path or visible text reads as "About" --
// checked against both since sites vary (some use /about-us, some just
// label a nav item "Who We Are" with an href like /firm-overview).
function findAboutLink(root, baseUrl) {
  const candidates = [];
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    let resolved;
    try {
      resolved = new URL(href, baseUrl);
    } catch {
      continue;
    }
    const pathLower = resolved.pathname.toLowerCase();
    const textLower = (a.text || "").trim().toLowerCase();
    const hrefMatches = /\babout([-_]?us)?\b/.test(pathLower);
    const textMatches =
      /^about(\s+us|\s+our\s+firm)?$/.test(textLower) ||
      textLower.includes("who we are");
    if (hrefMatches || textMatches) {
      candidates.push({ url: resolved.href, score: (hrefMatches ? 2 : 0) + (textMatches ? 1 : 0) });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

function extractParagraphs(root) {
  for (const tag of NOISE_TAGS) {
    for (const el of root.querySelectorAll(tag)) el.remove();
  }
  const scope = root.querySelector("main") || root.querySelector("article") || root.querySelector("body");
  if (!scope) return [];
  return scope
    .querySelectorAll("p")
    .map((p) => decodeEntities(p.text || ""))
    .filter((t) => t.length >= MIN_PARAGRAPH_LENGTH)
    .filter((t) => !JUNK_MARKERS.some((marker) => t.toLowerCase().includes(marker)));
}

function buildBios(paragraphs) {
  const bioShort = truncateAtWordBoundary(paragraphs[0], BIO_SHORT_MAX);
  let bioLong = "";
  for (const p of paragraphs) {
    const next = bioLong ? `${bioLong} ${p}` : p;
    if (next.length > BIO_LONG_MAX) break;
    bioLong = next;
  }
  return { bioShort, bioLong: bioLong || bioShort };
}

// Adapted from match-google-places.js's looksLikeSameBusiness -- same
// normalization, applied against a paragraph of prose instead of a single
// business-name field, so the threshold is more forgiving (a name mention
// can appear anywhere in running text, not as a clean match).
function normalizeForMatch(s) {
  return s
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(llp|pllc|plc|pc|llc|inc|the|law|firm|offices?|group|attorneys?|associates?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameAppearsInText(firmName, text) {
  const words = normalizeForMatch(firmName)
    .split(" ")
    .filter((w) => w.length > 2);
  if (words.length === 0) return true;
  const lowerText = text.toLowerCase();
  const hits = words.filter((w) => lowerText.includes(w));
  return hits.length / words.length >= 0.4;
}

async function main() {
  const { apply, skip, includeFlagged } = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase credentials in .env.local.");
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
      (r) => r.found && (includeFlagged || !r.flagged) && !skip.has(r.slug),
    );
    console.log(`Applying ${toApply.length} bio(s)...`);
    for (const r of toApply) {
      const { error } = await supabase
        .from("firms")
        .update({ bio_short: r.bio_short, bio_long: r.bio_long })
        .eq("slug", r.slug);
      if (error) {
        console.log(`  ✗ ${r.slug}: ${error.message}`);
      } else {
        console.log(`  ✓ ${r.slug}: bio_short + bio_long set (from ${r.source_url})`);
      }
    }
    return;
  }

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

  console.log(`${firms.length} bio-less firms with a website. Scraping...\n`);

  const report = [];
  for (const firm of firms) {
    const prefix = `[${firm.slug}] ${firm.name}`;
    let baseUrl;
    try {
      baseUrl = new URL(firm.website).href;
    } catch {
      console.log(`${prefix}: invalid website URL`);
      report.push({ slug: firm.slug, name: firm.name, found: false, reason: "invalid website URL" });
      continue;
    }

    try {
      const homeHtml = await fetchHtml(baseUrl);
      const homeRoot = parse(homeHtml, { lowerCaseTagName: true });
      const aboutUrl = findAboutLink(homeRoot, baseUrl);

      let sourceUrl = baseUrl;
      let root = homeRoot;
      if (aboutUrl && aboutUrl !== baseUrl) {
        try {
          const aboutHtml = await fetchHtml(aboutUrl);
          root = parse(aboutHtml, { lowerCaseTagName: true });
          sourceUrl = aboutUrl;
        } catch {
          // About page fetch failed -- fall back to homepage content
          // already fetched above rather than failing the firm entirely.
        }
      }

      const paragraphs = extractParagraphs(root);
      if (paragraphs.length === 0) {
        console.log(`${prefix}: no usable paragraph text — needs manual outreach`);
        report.push({ slug: firm.slug, name: firm.name, found: false, reason: "no usable paragraph text" });
        continue;
      }

      const { bioShort, bioLong } = buildBios(paragraphs);
      const flagged = !nameAppearsInText(firm.name, bioLong);
      console.log(
        `${prefix}${flagged ? "  ⚠ FLAGGED (name not found in text)" : ""}\n` +
          `    source: ${sourceUrl}\n` +
          `    "${bioShort}"`,
      );
      report.push({
        slug: firm.slug,
        name: firm.name,
        found: true,
        flagged,
        source_url: sourceUrl,
        bio_short: bioShort,
        bio_long: bioLong,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`${prefix}: error — ${reason}`);
      report.push({ slug: firm.slug, name: firm.name, found: false, reason });
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const found = report.filter((r) => r.found);
  const flagged = found.filter((r) => r.flagged);
  const clean = found.filter((r) => !r.flagged);
  const failed = report.filter((r) => !r.found);

  console.log("\n--- Summary ---");
  console.log(`Clean:   ${clean.length}/${firms.length}`);
  console.log(`Flagged: ${flagged.length}/${firms.length}`);
  console.log(`Failed:  ${failed.length}/${firms.length}`);
  if (failed.length > 0) {
    console.log("\nFailed (candidates for the manual-outreach list):");
    for (const r of failed) {
      console.log(`  - ${r.name} (${r.slug}): ${r.reason}`);
    }
  }
  console.log(`\nReport written to ${REPORT_PATH}`);
  console.log(
    "Dry run only — no database changes made. Review the report (especially " +
      "flagged entries), then re-run with --apply (clean results only by " +
      "default; add --include-flagged to also apply flagged ones after " +
      "reviewing them).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
