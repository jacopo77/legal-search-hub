import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/hero/hero";
import { ListingSection } from "@/components/listings/listing-section";
import { SearchResults } from "@/components/listings/search-results";

export type CitySearchParams = { q?: string; practiceArea?: string };

// Shared city-page body used by BOTH app/[city]/page.tsx and (in
// HOMEPAGE_MODE=phoenix) app/page.tsx — the route files are thin wrappers
// so the two paths can never diverge (ARCHITECTURE.md §3).
async function getCity(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select(
      "id, slug, name, state, status, hero_image_url, hero_headline, hero_subtext",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error(`CityPageContent: city query failed for "${slug}"`, error);
    return null;
  }
  return data;
}

export async function CityPageContent({
  citySlug,
  searchParams = {},
}: {
  citySlug: string;
  searchParams?: CitySearchParams;
}) {
  const city = await getCity(citySlug);

  // Unknown slugs and coming_soon cities both 404 — only live cities render.
  if (!city || city.status !== "live") notFound();

  // An active search/filter swaps the tiered sections for the results view
  // (T11). q takes precedence over the chip filter.
  const query = searchParams.q?.trim() || undefined;
  const practiceArea = searchParams.practiceArea?.trim() || undefined;
  const isSearching = Boolean(query || practiceArea);

  return (
    <>
      <Hero
        city={{
          id: city.id,
          slug: city.slug,
          name: city.name,
          state: city.state,
          heroImageUrl: city.hero_image_url,
          heroHeadline: city.hero_headline,
          heroSubtext: city.hero_subtext,
        }}
        query={query}
        activePracticeArea={practiceArea}
      />
      <div id="results" className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        {isSearching ? (
          <SearchResults
            cityId={city.id}
            citySlug={city.slug}
            query={query}
            practiceAreaSlug={practiceArea}
          />
        ) : (
          <>
            <ListingSection
              tier="premium"
              cityId={city.id}
              citySlug={city.slug}
            />
            <ListingSection tier="free" cityId={city.id} citySlug={city.slug} />
          </>
        )}
      </div>
    </>
  );
}
