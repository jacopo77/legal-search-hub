import Link from "next/link";
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

  // An empty premium section renders nothing at all — no "coming soon"
  // filler for a paid placement.
  if (firms.length === 0 && tier === "premium") return null;

  return (
    <section aria-labelledby={`${tier}-listings-heading`}>
      <h2
        id={`${tier}-listings-heading`}
        className="text-xl font-semibold tracking-tight"
      >
        {tier === "premium" ? "Premium firms" : "All firms"}
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
        <ul
          className={
            tier === "premium"
              ? "mt-5 grid gap-5 sm:grid-cols-2"
              : "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {firms.map((firm) =>
            tier === "premium" ? (
              <PremiumListingCard
                key={firm.id}
                firm={firm}
                citySlug={citySlug}
              />
            ) : (
              <FreeListingCard key={firm.id} firm={firm} citySlug={citySlug} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
