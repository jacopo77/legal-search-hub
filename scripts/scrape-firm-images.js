#!/usr/bin/env node

/**
 * Scrape hero/office/logo images for each firm from its website.
 *
 * Run with:
 *   node scripts/scrape-firm-images.js
 *
 * Reads firms from Supabase (service_role key required), fetches each
 * homepage, picks the largest/most prominent image, converts it to JPEG,
 * and saves it to public/firms/[slug].jpg.
 *
 * Firms whose image cannot be fetched are logged for manual sourcing.
 */

"use strict";

process.loadEnvFile(".env.local");

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { parse } = require("node-html-parser");
const sharp = require("sharp");

const PUBLIC_FIRMS_DIR = path.join(__dirname, "..", "public", "firms");
const OUTPUT_QUALITY = 85;
const MAX_OUTPUT_WIDTH = 1600;
const REQUEST_TIMEOUT_MS = 15000;
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const POSITIVE_KEYWORDS = [
  "hero",
  "banner",
  "office",
  "exterior",
  "building",
  "team",
  "staff",
  "attorney",
  "lawyer",
  "logo",
  "header",
  "featured",
];

const NEGATIVE_KEYWORDS = [
  "icon",
  "button",
  "spinner",
  "loading",
  "avatar",
  "thumbnail",
  "social",
  "facebook",
  "twitter",
  "linkedin",
  "badge",
  "payment",
  "cart",
  "menu",
];

function normalizeUrl(raw, base) {
  if (!raw) return null;
  raw = raw.trim();
  if (raw.startsWith("data:")) return null;
  try {
    return new URL(raw, base).href;
  } catch {
    return null;
  }
}

function keywordScore(text) {
  const lower = (text || "").toLowerCase();
  let score = 0;
  for (const word of POSITIVE_KEYWORDS) {
    if (lower.includes(word)) score += 50;
  }
  for (const word of NEGATIVE_KEYWORDS) {
    if (lower.includes(word)) score -= 100;
  }
  return score;
}

function parseExplicitSize(el) {
  const w = parseInt(el.getAttribute("width") || "", 10);
  const h = parseInt(el.getAttribute("height") || "", 10);
  if (w > 0 && h > 0) return w * h;
  return 0;
}

function collectCandidates(root, baseUrl) {
  const candidates = [];

  // Open Graph / Twitter Card images are usually the hero/featured image.
  const metaSelectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'meta[name="image"]',
  ];
  for (const selector of metaSelectors) {
    for (const meta of root.querySelectorAll(selector)) {
      const src = normalizeUrl(meta.getAttribute("content"), baseUrl);
      if (src) {
        candidates.push({
          src,
          source: "meta",
          score: 1000 + keywordScore(src),
        });
      }
    }
  }

  // Collect all visible-ish img tags.
  const imgs = root.querySelectorAll("img");
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];

    // Prefer data-src / srcset originals when lazy-loaded.
    const src =
      img.getAttribute("data-src") ||
      img.getAttribute("data-lazy-src") ||
      img.getAttribute("src");

    if (!src) continue;

    const normalized = normalizeUrl(src, baseUrl);
    if (!normalized) continue;

    const alt = img.getAttribute("alt") || "";
    const className = img.classNames || "";
    const id = img.getAttribute("id") || "";
    const ariaLabel = img.getAttribute("aria-label") || "";
    const context = `${normalized} ${alt} ${className} ${id} ${ariaLabel}`;

    const explicitArea = parseExplicitSize(img);
    const sizeBonus = explicitArea > 0 ? Math.log10(explicitArea) * 10 : 0;
    const positionBonus = Math.max(0, (imgs.length - i) / imgs.length) * 25;

    candidates.push({
      src: normalized,
      source: "img",
      score:
        keywordScore(context) +
        sizeBonus +
        positionBonus +
        (alt ? 10 : 0),
    });
  }

  // Deduplicate by URL, keeping the highest-scoring entry.
  const byUrl = new Map();
  for (const c of candidates) {
    const existing = byUrl.get(c.src);
    if (!existing || c.score > existing.score) {
      byUrl.set(c.src, c);
    }
  }
  return Array.from(byUrl.values()).sort((a, b) => b.score - a.score);
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    return res.text();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchImageSize(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { ...FETCH_HEADERS, Accept: "image/*,*/*;q=0.8" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    return {
      url,
      buffer,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format,
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function pickBestImage(candidates, baseUrl) {
  // Try the top-scored candidates until one yields a valid image.
  // Limit to the first 8 to avoid hammering the server.
  for (const candidate of candidates.slice(0, 8)) {
    try {
      const info = await fetchImageSize(candidate.src);
      if (info.width > 0 && info.height > 0) {
        return info;
      }
    } catch {
      // Fall through to the next candidate.
    }
  }
  return null;
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY are set in .env.local.",
    );
    process.exit(1);
  }

  fs.mkdirSync(PUBLIC_FIRMS_DIR, { recursive: true });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: firms, error } = await supabase
    .from("firms")
    .select("id, slug, name, website")
    .order("name");

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    process.exit(1);
  }

  if (!firms || firms.length === 0) {
    console.log("No firms found.");
    return;
  }

  console.log(`Found ${firms.length} firms. Starting scrape...\n`);

  const saved = [];
  const skipped = [];
  const needManual = [];

  for (const firm of firms) {
    const prefix = `[${firm.slug}] ${firm.name}`;

    if (!firm.website) {
      console.log(`${prefix}: no website — skipped`);
      skipped.push({ firm, reason: "no website" });
      continue;
    }

    let baseUrl;
    try {
      baseUrl = new URL(firm.website).origin;
    } catch {
      console.log(`${prefix}: invalid website URL — skipped`);
      skipped.push({ firm, reason: "invalid website URL" });
      continue;
    }

    try {
      console.log(`${prefix}: fetching ${firm.website}`);
      const html = await fetchHtml(firm.website);
      const root = parse(html, { lowerCaseTagName: true });
      const candidates = collectCandidates(root, baseUrl);

      if (candidates.length === 0) {
        console.log(`${prefix}: no image candidates found — needs manual sourcing`);
        needManual.push({ firm, reason: "no image candidates" });
        continue;
      }

      const best = await pickBestImage(candidates, baseUrl);
      if (!best) {
        console.log(`${prefix}: could not fetch a valid image — needs manual sourcing`);
        needManual.push({ firm, reason: "image fetch failed" });
        continue;
      }

      const outputPath = await saveJpeg(firm.slug, best.buffer);
      console.log(
        `${prefix}: saved ${best.width}x${best.height} ${best.format} → ${outputPath}`,
      );
      saved.push({ firm, path: outputPath, width: best.width, height: best.height });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`${prefix}: error — ${reason}`);
      needManual.push({ firm, reason });
    }

    // Small polite delay between firms.
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  console.log("\n--- Summary ---");
  console.log(`Saved:    ${saved.length}/${firms.length}`);
  console.log(`Skipped:  ${skipped.length}/${firms.length}`);
  console.log(`Manual:   ${needManual.length}/${firms.length}`);

  if (needManual.length > 0) {
    console.log("\nFirms needing manual image sourcing:");
    for (const { firm, reason } of needManual) {
      console.log(`  - ${firm.name} (${firm.slug}): ${reason}`);
    }
  }

  if (skipped.length > 0) {
    console.log("\nSkipped firms:");
    for (const { firm, reason } of skipped) {
      console.log(`  - ${firm.name} (${firm.slug}): ${reason}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
