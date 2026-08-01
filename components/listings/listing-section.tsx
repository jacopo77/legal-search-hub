import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PremiumListingCard } from "./premium-listing-card";
import { PremiumPlaceholderCard } from "./premium-placeholder-card";
import { FreeListingCard } from "./free-listing-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  mapFirmRow,
  partitionByImage,
  type FirmRow,
  type ListingFirm,
} from "./types";

// Seeded pseudo-random generator (LCG). Same seed → same sequence.
function createSeededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return () => {
    hash = (hash * 16807) % 2147483647;
    return (hash - 1) / 2147483646;
  };
}

// Shuffle an array in-place using a supplied random function.
function shuffleInPlace<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Re-order items so no two consecutive entries share the same category.
// Within each category the order is already randomized.  Falls back to
// same-category adjacency when unavoidable (e.g. one category dominates).
function arrangeByVariety<T>(
  items: T[],
  getCategory: (item: T) => string,
  random: () => number,
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const cat = getCategory(item);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  // Randomize inside each group so the greedy pick is non-deterministic
  // beyond the category constraint.
  for (const [, list] of groups) {
    shuffleInPlace(list, random);
  }

  const result: T[] = [];
  let lastCategory: string | null = null;

  while (result.length < items.length) {
    const available = Array.from(groups.entries())
      .filter(([cat, list]) => list.length > 0 && cat !== lastCategory)
      .sort((a, b) => {
        const diff = b[1].length - a[1].length;
        return diff !== 0 ? diff : random() - 0.5;
      });

    if (available.length === 0) {
      const remaining = Array.from(groups.entries()).filter(
        ([_, list]) => list.length > 0,
      );
      if (remaining.length === 0) break;
      available.push(...remaining);
    }

    const [cat, list] = available[0];
    const item = list.pop()!;
    result.push(item);
    lastCategory = cat;
  }

  return result;
}

// One tier's listing section on the city page. Queries live firms for the
// current city + tier with practice areas joined. The status='live' filter
// lives here in the query layer per CLAUDE.md's data-model rules.
async function getFirms(cityId: string, tier: "premium" | "free") {
  const supabase = await createClient();
  let query = supabase
    .from("firms")
    .select(
      `id, slug, name, tier, phone, address, bio_short, logo_url,
       google_rating, google_review_count, google_place_id,
       owner_id, claim_badge_hidden, premium_badge,
       firm_practice_areas(practice_areas(slug, name))`,
    )
    .eq("city_id", cityId)
    .eq("status", "live")
    .eq("tier", tier);

  if (tier === "premium") {
    query = query
      .order("google_rating", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    console.error(`ListingSection(${tier}): firms query failed`, error);
    return [];
  }
  return (data as unknown as FirmRow[]).map(mapFirmRow);
}

export async function ListingSection({
  tier,
  cityId,
  citySlug,
}: {
  tier: "premium" | "free";
  cityId: string;
  citySlug: string;
}) {
  const firms = await getFirms(cityId, tier);

  if (tier === "premium") {
    const featured = firms.slice(0, 3);
    const placeholderCount = Math.max(0, 3 - featured.length);

    return (
      <section aria-labelledby="featured-listings-heading">
        <h2
          id="featured-listings-heading"
          className="font-heading text-3xl font-normal tracking-tight text-navy"
        >
          Featured Listings
        </h2>

        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((firm) => (
            <PremiumListingCard
              key={firm.id}
              firm={firm}
              citySlug={citySlug}
            />
          ))}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <PremiumPlaceholderCard key={`placeholder-${i}`} imageIndex={i} />
          ))}
        </ul>
      </section>
    );
  }

  // Free tier: seeded daily shuffle with practice-area variety.
  const dailySeed = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const random = createSeededRandom(dailySeed);
  const shuffled = arrangeByVariety(
    firms,
    (firm: ListingFirm) => firm.practiceAreas[0]?.name ?? "General",
    random,
  );
  // Photo firms first (as a block), placeholder-card firms after — each
  // block keeps the shuffle/variety order above untouched.
  const preview = partitionByImage(shuffled).slice(0, 6);

  return (
    <section
      aria-labelledby="all-firms-heading"
      className="border-t border-border bg-white pt-12"
    >
      <h2
        id="all-firms-heading"
        className="font-heading text-3xl font-normal tracking-tight text-navy"
      >
        All Firms
      </h2>

      {preview.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <Building2 className="size-8 text-muted-foreground/60" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No firms are listed yet. Know a great firm — or run one?{" "}
            <Link href="/list-your-firm" className="text-primary hover:underline">
              List your firm
            </Link>{" "}
            to be the first.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((firm) => (
              <FreeListingCard key={firm.id} firm={firm} citySlug={citySlug} />
            ))}
          </ul>

          <div className="mt-8 text-center">
            <Link
              href={`/${citySlug}/firms`}
              className={cn(
                buttonVariants({ variant: "outline-navy" }),
                "gap-2 px-5 py-2.5 text-sm font-semibold",
              )}
            >
              View All Firms
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
