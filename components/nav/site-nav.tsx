import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { CitySelector, type CitySelectorCity } from "./city-selector";

// Sitewide header. Server Component: reads the cities table directly so the
// selector always reflects the DB (Phoenix live, others coming_soon).
async function getCities(): Promise<CitySelectorCity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("slug, name, state, status")
    .order("sort_order", { ascending: true });
  if (error) {
    // Nav must still render if the query fails — log and show no cities.
    console.error("SiteNav: cities query failed", error);
    return [];
  }
  return data ?? [];
}

export async function SiteNav() {
  const cities = await getCities();

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/Untitled_design.png"
            alt=""
            width={500}
            height={500}
            className="h-[80px] w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <CitySelector cities={cities} />
          <Link
            href="/sign-in"
            className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-navy transition-colors hover:bg-muted sm:inline-block"
          >
            Login / Register
          </Link>
          <Link
            href="/list-your-firm"
            className="inline-flex h-9 items-center rounded-lg border-2 border-navy px-4 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            List Your Firm
          </Link>
        </nav>
      </div>
    </header>
  );
}
