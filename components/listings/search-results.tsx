import Link from "next/link";
import { searchFirms, firmsByPracticeArea } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { PremiumListingCard } from "./premium-listing-card";
import { FreeListingCard } from "./free-listing-card";

// Results view for the Hero search (?q=) and practice-area chips
// (?practiceArea=). Replaces the tiered sections on the city page whenever
// a query/filter is active (T11).
export async function SearchResults({
  cityId,
  citySlug,
  query,
  practiceAreaSlug,
}: {
  cityId: string;
  citySlug: string;
  query?: string;
  practiceAreaSlug?: string;
}) {
  const firms = query
    ? await searchFirms(cityId, query)
    : await firmsByPracticeArea(cityId, practiceAreaSlug ?? "");

  // Resolve the practice area's display name for the heading when filtering
  // by chip.
  let practiceAreaName: string | null = null;
  if (!query && practiceAreaSlug) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("practice_areas")
      .select("name")
      .eq("slug", practiceAreaSlug)
      .maybeSingle();
    practiceAreaName = data?.name ?? practiceAreaSlug;
  }

  const count = firms.length;
  const heading = query
    ? `${count} result${count === 1 ? "" : "s"} for “${query}”`
    : `${count} ${practiceAreaName} firm${count === 1 ? "" : "s"}`;

  return (
    <section aria-labelledby="search-results-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="search-results-heading" className="text-xl font-semibold">
          {heading}
        </h2>
        <Link
          href={`/${citySlug}`}
          className="text-sm text-primary hover:underline"
        >
          Clear search
        </Link>
      </div>

      {firms.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No firms match{query ? ` “${query}”` : ""} yet. Try a different
          search, or browse all firms below.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) =>
            firm.tier === "premium" ? (
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
