import Link from "next/link";
import { Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
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
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Scale className="size-5 text-primary" aria-hidden />
          Legal Search Hub
        </Link>
        <nav className="flex items-center gap-1">
          <CitySelector cities={cities} />
          {/* T14 builds this route (free signup flow). */}
          <Link href="/list-your-firm" className={buttonVariants({ size: "sm" })}>
            List Your Firm
          </Link>
        </nav>
      </div>
    </header>
  );
}
