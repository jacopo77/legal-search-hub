import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// The one Hero component for every city (CLAUDE.md rule 1): all copy is
// parameterized by the city row — nothing Phoenix-specific may be written
// here. Rendered by CityPageContent (T8) for both /[city] and / in
// HOMEPAGE_MODE=phoenix (T9).
export type HeroCity = {
  slug: string;
  name: string;
  state: string;
  heroImageUrl: string | null;
};

async function getPracticeAreas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_areas")
    .select("slug, name")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Hero: practice_areas query failed", error);
    return [];
  }
  return data ?? [];
}

export async function Hero({ city }: { city: HeroCity }) {
  const practiceAreas = await getPracticeAreas();

  return (
    <section className="relative overflow-hidden">
      {/* Full-bleed hero image from cities.hero_image_url (Supabase Storage,
          city-hero-images bucket). Decorative — content stays readable via
          the overlay, and a brand gradient covers the no-image case. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/40 bg-cover bg-center"
        style={
          city.heroImageUrl
            ? { backgroundImage: `url(${city.heroImageUrl})` }
            : undefined
        }
      />
      <div aria-hidden className="absolute inset-0 bg-black/40" />

      <div className="relative mx-auto max-w-3xl px-4 py-24 text-center text-white sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Find the right attorney in {city.name}
        </h1>
        <p className="mt-4 text-lg text-white/85">
          Compare {city.name}, {city.state} law firms by practice area and
          Google rating — free to search, no signup needed.
        </p>

        {/* Plain GET form: crawlable, works without JS. T11 turns ?q= into
            real full-text/trigram results. */}
        <form
          action={`/${city.slug}`}
          role="search"
          className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl bg-white p-2 shadow-lg"
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
            placeholder={`Search ${city.name} attorneys by name, practice area, or keyword`}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Search
          </button>
        </form>

        {/* Practice-area chips: plain filter links, not text search (§8). */}
        {practiceAreas.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {practiceAreas.map((area) => (
              <li key={area.slug}>
                <a
                  href={`/${city.slug}?practiceArea=${area.slug}`}
                  className="inline-block rounded-full border border-white/40 bg-white/10 px-3.5 py-1.5 text-sm text-white backdrop-blur transition-colors hover:bg-white/25"
                >
                  {area.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
