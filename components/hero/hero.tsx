import { Fragment } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// The one Hero component for every city (CLAUDE.md rule 1): all copy is
// parameterized by the city row (hero_headline/hero_subtext, with generic
// fallbacks) — nothing Phoenix-specific may be written here. Rendered by
// CityPageContent (T8) for both /[city] and / in HOMEPAGE_MODE=phoenix (T9).
export type HeroCity = {
  id: string;
  slug: string;
  name: string;
  state: string;
  heroImageUrl: string | null;
  heroHeadline: string | null;
  heroSubtext: string | null;
};

type PracticeAreaLink = {
  practice_areas: { slug: string; name: string; sort_order: number } | null;
};

// Only practice areas with at least one live firm IN THIS CITY are promoted
// as hero pills — a zero-result category (e.g. Divorce before any firm is
// tagged) is a dead end once clicked, so it shouldn't be advertised in the
// first place. Scoped per-city rather than globally, since a category could
// be populated in one city and empty in another as more cities launch.
// Queries firm_practice_areas (not practice_areas directly) so the inner
// joins to both firms and practice_areas can filter in one round trip;
// results are deduped client-side since a category with N live firms
// otherwise comes back as N rows.
async function getPracticeAreas(cityId: string) {
  const supabase = await createClient();
  // "general-practice" is the catch-all bucket for generically-categorized
  // leads (see seed.mjs) — a data-quality fallback, not a genuine specialty
  // users search for, so it's excluded at the source rather than filtered
  // in the template (which would violate the one-city-template rule if
  // done per-page instead of here).
  const { data, error } = await supabase
    .from("firm_practice_areas")
    .select(
      "practice_areas!inner(slug, name, sort_order), firms!inner(city_id, status)",
    )
    .eq("firms.city_id", cityId)
    .eq("firms.status", "live")
    .neq("practice_areas.slug", "general-practice");
  if (error) {
    console.error("Hero: practice_areas query failed", error);
    return [];
  }
  const seen = new Map<string, { slug: string; name: string; sort_order: number }>();
  for (const row of (data ?? []) as unknown as PracticeAreaLink[]) {
    const area = row.practice_areas;
    if (area && !seen.has(area.slug)) {
      seen.set(area.slug, area);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.sort_order - b.sort_order);
}

export async function Hero({
  city,
  query,
  activePracticeArea,
}: {
  city: HeroCity;
  // Current ?q= value, if any — kept visible in the input after a search
  // rather than appearing to clear (fed back from CityPageContent).
  query?: string;
  // Current ?practiceArea= slug, if any — highlights the matching chip.
  activePracticeArea?: string;
}) {
  const displayAreas = await getPracticeAreas(city.id);

  const headline = city.heroHeadline ?? `Find the right attorney in ${city.name}`;
  const subtext =
    city.heroSubtext ??
    `Compare ${city.name}, ${city.state} law firms by practice area and Google rating — free to search, no signup needed.`;

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      {/* Full-bleed hero image from cities.hero_image_url (local public/
          asset for Phoenix; other cities via their row). Decorative. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={
          city.heroImageUrl
            ? { backgroundImage: `url(${city.heroImageUrl})` }
            : undefined
        }
      />
      {/* Uniform darkening for text readability — flat 30% black across the
          whole image, no gradient/scrim. */}
      <div aria-hidden className="absolute inset-0 bg-black/20" />

      <div className="relative mx-auto w-full max-w-4xl px-4 py-20 text-center text-white">
        <h1
          className="font-heading font-normal leading-tight tracking-tight text-balance"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          {headline}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
          {subtext}
        </p>

        {/* Plain GET form: crawlable, works without JS. T11 turns ?q= into
            real full-text/trigram results. The action's #results fragment
            is preserved by the browser when it serializes the query string
            on submit, landing on the results section with no JS required. */}
        <form
          action={`/${city.slug}#results`}
          role="search"
          className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border-2 border-transparent bg-white p-2 shadow-lg focus-within:border-navy focus-within:ring-3 focus-within:ring-navy/30"
        >
          <Search
            className="ml-2 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="hero-search" className="sr-only">
            Search attorneys in {city.name}
          </label>
          <input
            id="hero-search"
            name="q"
            type="search"
            defaultValue={query ?? ""}
            placeholder={`Search ${city.name} attorneys by name, practice area, or keyword`}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            Search
          </button>
        </form>

        {/* Practice-area chips: plain filter links, not text search (§8).
            The active chip (matching ?practiceArea=) gets a filled style so
            it's visually clear which filter is currently applied. */}
        {displayAreas.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {displayAreas.map((area, index) => {
              const isActive = area.slug === activePracticeArea;
              // Forces an even split across two rows (e.g. 4+4 of 8) instead
              // of letting the last item wrap alone based on text width —
              // a flex-basis:100% spacer is a deterministic line break that
              // doesn't need JS and still holds if a practice area is added.
              const breakBefore =
                index > 0 && index === Math.ceil(displayAreas.length / 2);
              return (
                <Fragment key={area.slug}>
                  {breakBefore && (
                    <li aria-hidden className="h-0 basis-full" />
                  )}
                  <li>
                    <a
                      href={`/${city.slug}?practiceArea=${area.slug}#results`}
                      aria-current={isActive ? "true" : undefined}
                      className={
                        isActive
                          ? "inline-block rounded-full border border-white bg-white px-4 py-1.5 text-sm font-semibold text-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                          : "inline-block rounded-full border border-white/40 bg-navy/80 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      }
                    >
                      {area.name}
                    </a>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
