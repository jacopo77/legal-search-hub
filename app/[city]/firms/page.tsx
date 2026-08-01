import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FreeListingCard } from "@/components/listings/free-listing-card";
import { SortMenu, type SortOption } from "@/components/listings/sort-menu";
import {
  mapFirmRow,
  partitionByImage,
  type FirmRow,
} from "@/components/listings/types";

async function getCity(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, slug, name, state, status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error(`AllFirmsPage: city query failed for "${slug}"`, error);
    return null;
  }
  return data;
}

async function getPracticeAreas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_areas")
    .select("slug, name")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("AllFirmsPage: practice_areas query failed", error);
    return [];
  }
  return data ?? [];
}

async function getFreeFirms(
  cityId: string,
  practiceAreaSlug: string | undefined,
  sort: SortOption,
) {
  const supabase = await createClient();
  const fields = `id, slug, name, tier, phone, address, bio_short, logo_url,
       google_rating, google_review_count, google_place_id,
       owner_id, claim_badge_hidden, premium_badge`;

  // The practice-area filter needs an inner join to the link table so the
  // `.eq` below actually restricts rows (matches lib/search.ts
  // firmsByPracticeArea); unfiltered keeps the plain left join so every
  // firm's full practice-area list still comes back for card display.
  let query = practiceAreaSlug
    ? supabase
        .from("firms")
        .select(
          `${fields}, firm_practice_areas!inner(practice_areas!inner(slug, name))`,
        )
        .eq("firm_practice_areas.practice_areas.slug", practiceAreaSlug)
    : supabase
        .from("firms")
        .select(`${fields}, firm_practice_areas(practice_areas(slug, name))`);

  query = query.eq("city_id", cityId).eq("status", "live").eq("tier", "free");

  if (sort === "rating") {
    query = query
      .order("google_rating", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true });
  } else if (sort === "reviews") {
    query = query
      .order("google_review_count", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true });
  } else {
    query = query.order("name", { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    console.error("AllFirmsPage: free firms query failed", error);
    return [];
  }
  const firms = (data as unknown as FirmRow[]).map(mapFirmRow);

  // The image-first partition is a cosmetic default for the unsorted grid
  // (fd3a871) — an explicit rating/review sort is a deliberate user choice
  // and takes priority over it.
  return sort === "name" ? partitionByImage(firms) : firms;
}

function isSortOption(value: string | undefined): value is SortOption {
  return value === "rating" || value === "reviews" || value === "name";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const cityRow = await getCity(city);
  if (!cityRow || cityRow.status !== "live") {
    return {};
  }
  return {
    title: `All ${cityRow.name}, ${cityRow.state} Law Firms | Legal Search Hub`,
  };
}

export default async function AllFirmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ practiceArea?: string; sort?: string }>;
}) {
  const { city } = await params;
  const { practiceArea, sort: sortParam } = await searchParams;
  const cityRow = await getCity(city);
  if (!cityRow || cityRow.status !== "live") notFound();

  const citySlug = cityRow.slug;
  const sort: SortOption = isSortOption(sortParam) ? sortParam : "name";
  const [firms, practiceAreas] = await Promise.all([
    getFreeFirms(cityRow.id, practiceArea, sort),
    getPracticeAreas(),
  ]);

  function buildHref({
    practiceArea: nextArea,
    sort: nextSort,
  }: {
    practiceArea?: string;
    sort?: SortOption;
  }) {
    const params = new URLSearchParams();
    if (nextArea) params.set("practiceArea", nextArea);
    if (nextSort && nextSort !== "name") params.set("sort", nextSort);
    const qs = params.toString();
    return `/${citySlug}/firms${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <Link
          href={`/${cityRow.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to {cityRow.name} directory
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy">
          All Firms in {cityRow.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse every {cityRow.name}, {cityRow.state} law firm in our directory.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {practiceAreas.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={buildHref({ sort })}
                aria-current={!practiceArea ? "true" : undefined}
                className={
                  !practiceArea
                    ? "inline-block rounded-full border border-navy bg-navy px-3.5 py-1.5 text-sm font-semibold text-white"
                    : "inline-block rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                }
              >
                All
              </Link>
            </li>
            {practiceAreas.map((area) => {
              const isActive = area.slug === practiceArea;
              return (
                <li key={area.slug}>
                  <Link
                    href={buildHref({ practiceArea: area.slug, sort })}
                    aria-current={isActive ? "true" : undefined}
                    className={
                      isActive
                        ? "inline-block rounded-full border border-navy bg-navy px-3.5 py-1.5 text-sm font-semibold text-white"
                        : "inline-block rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    }
                  >
                    {area.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <SortMenu
          active={sort}
          options={(["name", "rating", "reviews"] as SortOption[]).map(
            (option) => ({
              option,
              href: buildHref({ practiceArea, sort: option }),
            }),
          )}
        />
      </div>

      {firms.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          {practiceArea
            ? "No firms match this practice area yet. Try another filter, or "
            : "No firms are listed yet. "}
          <Link href="/list-your-firm" className="text-primary hover:underline">
            List your firm
          </Link>{" "}
          to be the first.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <FreeListingCard key={firm.id} firm={firm} citySlug={cityRow.slug} />
          ))}
        </ul>
      )}
    </div>
  );
}
