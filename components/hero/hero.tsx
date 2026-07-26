import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// The one Hero component for every city (CLAUDE.md rule 1): all copy is
// parameterized by the city row (hero_headline/hero_subtext, with generic
// fallbacks) — nothing Phoenix-specific may be written here. Rendered by
// CityPageContent (T8) for both /[city] and / in HOMEPAGE_MODE=phoenix (T9).
export type HeroCity = {
  slug: string;
  name: string;
  state: string;
  heroImageUrl: string | null;
  heroHeadline: string | null;
  heroSubtext: string | null;
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

  // Insert Divorce chip immediately after Family Law for v1 launch.
  const displayAreas = [...practiceAreas];
  const familyLawIndex = displayAreas.findIndex(
    (a) => a.slug === "family-law",
  );
  if (familyLawIndex !== -1) {
    displayAreas.splice(familyLawIndex + 1, 0, {
      slug: "divorce",
      name: "Divorce",
    });
  }

  const headline = city.heroHeadline ?? `Find the right attorney in ${city.name}`;
  const subtext =
    city.heroSubtext ??
    `Compare ${city.name}, ${city.state} law firms by practice area and Google rating — free to search, no signup needed.`;

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      {/* Full-bleed hero image from cities.hero_image_url (local public/
          asset for Phoenix; other cities via their row). Decorative —
          content stays readable via the fixed 0.35 black overlay. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={
          city.heroImageUrl
            ? { backgroundImage: `url(${city.heroImageUrl})` }
            : undefined
        }
      />
      <div aria-hidden className="absolute inset-0 bg-black/35" />

      <div className="relative mx-auto w-full max-w-4xl px-4 py-20 text-center text-white">
        <h1
          className="font-bold tracking-tight text-balance"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          {headline}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
          {subtext}
        </p>

        {/* Plain GET form: crawlable, works without JS. T11 turns ?q= into
            real full-text/trigram results. */}
        <form
          action={`/${city.slug}`}
          role="search"
          className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl bg-white p-2 shadow-lg focus-within:ring-3 focus-within:ring-white/70"
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
            className="rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red/85"
          >
            Search
          </button>
        </form>

        {/* Practice-area chips: plain filter links, not text search (§8). */}
        {displayAreas.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {displayAreas.map((area) => (
              <li key={area.slug}>
                <a
                  href={`/${city.slug}?practiceArea=${area.slug}`}
                  className="inline-block rounded-full border border-white/70 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
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
