import Link from "next/link";
import { Search, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// National homepage — city-agnostic by design (ARCHITECTURE.md §3). No hero
// photo, clean background, crawlable Browse-by-City list. Rendered by both
// /company (always) and / when HOMEPAGE_MODE flips to "national" (T9).
type NationalCity = {
  slug: string;
  name: string;
  state: string;
  status: "live" | "coming_soon";
};

async function getCities(): Promise<NationalCity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("slug, name, state, status")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("NationalHome: cities query failed", error);
    return [];
  }
  return data ?? [];
}

export async function NationalHome() {
  const cities = await getCities();
  const liveCities = cities.filter((c) => c.status === "live");

  // Search is city-scoped in v1 (§8: no cross-city search). While exactly
  // one city is live, the search box submits there; once multiple cities
  // are live this form is hidden in favor of the Browse-by-City list —
  // which city to search becomes the visitor's explicit choice.
  const searchTarget = liveCities.length === 1 ? liveCities[0] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
      <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        Find the right attorney in your city
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Legal Search Hub is a curated directory of local law firms — compare
        by practice area and Google rating, free to search.
      </p>

      {searchTarget && (
        <form
          action={`/${searchTarget.slug}`}
          role="search"
          className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
        >
          <Search
            className="ml-2 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="national-search" className="sr-only">
            Search attorneys in {searchTarget.name}
          </label>
          <input
            id="national-search"
            name="q"
            type="search"
            placeholder={`Search ${searchTarget.name} attorneys by name, practice area, or keyword`}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Search
          </button>
        </form>
      )}

      <section aria-labelledby="browse-by-city-heading" className="mt-14">
        <h2
          id="browse-by-city-heading"
          className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Browse by city
        </h2>
        <ul className="mx-auto mt-4 max-w-md divide-y divide-border rounded-xl border border-border bg-card text-left">
          {cities.map((city) => (
            <li key={city.slug}>
              {city.status === "live" ? (
                <Link
                  href={`/${city.slug}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <MapPin className="size-4 text-primary" aria-hidden />
                    {city.name}, {city.state}
                  </span>
                  <span className="text-sm text-primary">Browse firms</span>
                </Link>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4" aria-hidden />
                    {city.name}, {city.state}
                  </span>
                  <span className="text-sm">Coming soon</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
