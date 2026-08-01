import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { CitySelector, type CitySelectorCity } from "./city-selector";
import { AccountMenu } from "./account-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [cities, supabase] = await Promise.all([
    getCities(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <div className="relative h-[90px] w-[161px]">
            <Image
              src="/Untitled_design_cropped.png"
              alt="Legal Search Hub"
              fill
              className="object-contain"
              priority
              sizes="161px"
            />
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <CitySelector cities={cities} />
          {user ? (
            <AccountMenu email={user.email ?? "Account"} />
          ) : (
            <Link
              href="/sign-in"
              className="hidden rounded-lg px-4 py-2.5 text-base font-medium text-navy transition-colors hover:bg-muted sm:inline-block"
            >
              Login / Register
            </Link>
          )}
          <Link
            href="/list-your-firm"
            className={cn(
              buttonVariants({ variant: "outline-navy" }),
              "h-11 px-5 text-base font-semibold",
            )}
          >
            List Your Firm
          </Link>
        </nav>
      </div>
    </header>
  );
}
