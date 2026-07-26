import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PremiumListingCard } from "./premium-listing-card";
import { PremiumPlaceholderCard } from "./premium-placeholder-card";
import { FreeListingCard } from "./free-listing-card";
import { mapFirmRow, type FirmRow } from "./types";

// One tier's listing section on the city page. Queries live firms for the
// current city + tier with practice areas joined. The status='live' filter
// lives here in the query layer per CLAUDE.md's data-model rules.
async function getFirms(cityId: string, tier: "premium" | "free") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("firms")
    .select(
      `id, slug, name, tier, phone, address, bio_short, logo_url,
       google_rating, google_review_count,
       firm_practice_areas(practice_areas(slug, name))`,
    )
    .eq("city_id", cityId)
    .eq("status", "live")
    .eq("tier", tier)
    .order("google_rating", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) {
    console.error(`ListingSection(${tier}): firms query failed`, error);
    return [];
  }
  // Untyped until `supabase gen types` (see lib/supabase/server.ts TODO).
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
          className="text-2xl font-bold tracking-tight text-navy"
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
            <PremiumPlaceholderCard key={`placeholder-${i}`} />
          ))}
        </ul>
      </section>
    );
  }

  const preview = firms.slice(0, 6);

  return (
    <section
      aria-labelledby="all-firms-heading"
      className="border-t border-border bg-white pt-12"
    >
      <h2
        id="all-firms-heading"
        className="text-2xl font-bold tracking-tight text-navy"
      >
        All Firms
      </h2>

      {preview.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No firms are listed yet. Know a great firm — or run one?{" "}
          <Link href="/list-your-firm" className="text-primary hover:underline">
            List your firm
          </Link>{" "}
          to be the first.
        </p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((firm) => (
              <FreeListingCard key={firm.id} firm={firm} citySlug={citySlug} />
            ))}
          </ul>

          {firms.length > 6 && (
            <div className="mt-8 text-center">
              <Link
                href={`/${citySlug}/firms`}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-navy px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                View All Firms
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
