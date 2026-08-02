import Link from "next/link";
import { SearchX } from "lucide-react";
import { searchFirms, firmsByPracticeArea } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { getFallbackPracticeArea } from "@/lib/practice-area-fallback";
import { PremiumListingCard } from "./premium-listing-card";
import { FreeListingCard } from "./free-listing-card";
import type { ListingFirm } from "./types";

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
  // Search and the category chip now compose: a query narrows within the
  // active practiceArea instead of one silently overriding the other.
  const firms = query
    ? await searchFirms(cityId, query, practiceAreaSlug)
    : await firmsByPracticeArea(cityId, practiceAreaSlug ?? "");

  // Resolve the practice area's display name whenever the chip is active,
  // not just in the no-query branch -- the heading and empty state both
  // need it now that query + practiceArea can be active together.
  let practiceAreaName: string | null = null;
  if (practiceAreaSlug) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("practice_areas")
      .select("name")
      .eq("slug", practiceAreaSlug)
      .maybeSingle();
    practiceAreaName = data?.name ?? practiceAreaSlug;
  }

  // Adjacent-category fallback (UX review Feature Gap #6): a bare category
  // chip with zero results is a dead end otherwise. Only applies with no
  // text query -- a query implies the user is matching a specific name, and
  // surfacing an unrelated category's results wouldn't answer that.
  let fallbackFirms: ListingFirm[] = [];
  let fallbackAreaName: string | null = null;
  if (!query && practiceAreaSlug && firms.length === 0) {
    const fallbackSlug = getFallbackPracticeArea(practiceAreaSlug);
    if (fallbackSlug) {
      const supabase = await createClient();
      const [{ data: fallbackArea }, results] = await Promise.all([
        supabase
          .from("practice_areas")
          .select("name")
          .eq("slug", fallbackSlug)
          .maybeSingle(),
        firmsByPracticeArea(cityId, fallbackSlug),
      ]);
      fallbackAreaName = fallbackArea?.name ?? fallbackSlug;
      fallbackFirms = results;
    }
  }

  const count = firms.length;
  const heading = query
    ? practiceAreaName
      ? `${count} ${practiceAreaName} result${count === 1 ? "" : "s"} for "${query}"`
      : `${count} result${count === 1 ? "" : "s"} for "${query}"`
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
        <>
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
            <SearchX className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {query ? (
                <>
                  No firms match &ldquo;{query}&rdquo;
                  {practiceAreaName ? ` in ${practiceAreaName}` : ""} yet. Try
                  a different search, or{" "}
                </>
              ) : (
                <>No {practiceAreaName} firms are listed yet. </>
              )}
              <Link
                href={`/${citySlug}/firms`}
                className="text-primary hover:underline"
              >
                browse all firms
              </Link>
              .
            </p>
          </div>

          {fallbackFirms.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground">
                No {practiceAreaName} firms yet — here are {fallbackAreaName}{" "}
                firms who handle {practiceAreaName?.toLowerCase()} cases
              </h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fallbackFirms.map((firm) =>
                  firm.tier === "premium" ? (
                    <PremiumListingCard
                      key={firm.id}
                      firm={firm}
                      citySlug={citySlug}
                    />
                  ) : (
                    <FreeListingCard
                      key={firm.id}
                      firm={firm}
                      citySlug={citySlug}
                    />
                  ),
                )}
              </ul>
            </div>
          )}
        </>
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
