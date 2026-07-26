import Link from "next/link";
import { Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PremiumListingCard } from "./premium-listing-card";
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

function PremiumPlaceholderCard({ cityName }: { cityName: string }) {
  return (
    <li className="relative rounded-xl border-2 border-dashed border-border bg-muted/30 p-5 transition-colors hover:bg-muted/50">
      <Link href="/list-your-firm" className="flex h-full flex-col">
        <div className="flex items-center gap-2 text-navy">
          <Crown className="size-5" aria-hidden />
          <span className="text-sm font-semibold">Claim this featured spot</span>
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          Upgrade to a premium listing and appear at the top of {cityName} search results.
        </p>
        <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline">
          List your firm →
        </span>
      </Link>
    </li>
  );
}

export async function ListingSection({
  tier,
  cityId,
  citySlug,
  cityName,
}: {
  tier: "premium" | "free";
  cityId: string;
  citySlug: string;
  cityName: string;
}) {
  const firms = await getFirms(cityId, tier);

  if (tier === "premium") {
    const placeholderCount = Math.max(0, 3 - firms.length);

    return (
      <section aria-labelledby="premium-listings-heading">
        <div className="flex items-center justify-between">
          <h2
            id="premium-listings-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Featured firms
          </h2>
          {firms.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {firms.length} premium listing{firms.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <PremiumListingCard
              key={firm.id}
              firm={firm}
              citySlug={citySlug}
            />
          ))}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <PremiumPlaceholderCard key={`placeholder-${i}`} cityName={cityName} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="free-listings-heading">
      <h2
        id="free-listings-heading"
        className="text-xl font-semibold tracking-tight"
      >
        All firms
      </h2>

      {firms.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No firms are listed yet. Know a great firm — or run one?{" "}
          <Link href="/list-your-firm" className="text-primary hover:underline">
            List your firm
          </Link>{" "}
          to be the first.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {firms.map((firm) => (
            <FreeListingCard key={firm.id} firm={firm} citySlug={citySlug} />
          ))}
        </ul>
      )}
    </section>
  );
}
