import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FreeListingCard } from "@/components/listings/free-listing-card";
import { SortMenu, type SortOption } from "@/components/listings/sort-menu";
import { getFallbackPracticeArea } from "@/lib/practice-area-fallback";
import { geocodeZip } from "@/lib/geocode-zip";
import { haversineMiles } from "@/lib/geo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  mapFirmRow,
  partitionByImage,
  type FirmRow,
  type ListingFirm,
} from "@/components/listings/types";

// Firms further than this from the entered ZIP are excluded rather than
// just sorted last -- a location filter that still shows a firm 40 miles
// away isn't really filtering. 25mi comfortably spans the Phoenix metro
// without being so wide it never excludes anything.
const LOCATION_RADIUS_MILES = 25;

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

type FreeFirmRow = FirmRow & {
  latitude?: number | null;
  longitude?: number | null;
};

const BASE_FIRM_FIELDS = `id, slug, name, tier, phone, address, bio_short, logo_url,
       google_rating, google_review_count, google_place_id,
       premium_badge`;

async function runFirmsQuery(
  cityId: string,
  practiceAreaSlug: string | undefined,
  sort: SortOption,
  applyOrder: boolean,
  fields: string,
) {
  const supabase = await createClient();
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

  if (applyOrder) {
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
  }

  return query;
}

// Only ever requests latitude/longitude when a location filter is actually
// active -- every ordinary page load (no zip) uses the exact same field set
// this page has always used, so it can never regress on account of the
// coordinates migration (0008) not being applied yet. If the one path that
// DOES request coordinates hits that (column doesn't exist), it degrades to
// the normal sorted list rather than erroring the whole page -- the caller
// surfaces locationApplied=false so the UI can say the filter didn't apply.
async function getFreeFirms(
  cityId: string,
  practiceAreaSlug: string | undefined,
  sort: SortOption,
  origin: { latitude: number; longitude: number } | null,
): Promise<{ firms: ListingFirm[]; locationApplied: boolean }> {
  if (!origin) {
    const { data, error } = await runFirmsQuery(
      cityId,
      practiceAreaSlug,
      sort,
      true,
      BASE_FIRM_FIELDS,
    );
    if (error) {
      console.error("AllFirmsPage: free firms query failed", error);
      return { firms: [], locationApplied: false };
    }
    const firms = (data as unknown as FirmRow[]).map(mapFirmRow);
    // The image-first partition (fd3a871) only applies to the alphabetical
    // sort, which is otherwise a flat, visually monotonous list of mostly
    // placeholder cards — rating/reviews sorts are a deliberate user choice
    // and already carry their own meaningful order, so they take priority
    // over this cosmetic grouping.
    return {
      firms: sort === "name" ? partitionByImage(firms) : firms,
      locationApplied: false,
    };
  }

  // A location filter replaces sort entirely -- proximity IS the ordering
  // implied by entering a ZIP -- so no DB-side .order() is applied here;
  // distance is computed and sorted in JS below instead.
  const { data, error } = await runFirmsQuery(
    cityId,
    practiceAreaSlug,
    sort,
    false,
    `${BASE_FIRM_FIELDS}, latitude, longitude`,
  );
  if (error) {
    if (error.message?.includes("does not exist")) {
      return getFreeFirms(cityId, practiceAreaSlug, sort, null);
    }
    console.error("AllFirmsPage: free firms query failed", error);
    return { firms: [], locationApplied: false };
  }

  const rows = data as unknown as Required<FreeFirmRow>[];
  // Firms not yet geocoded (latitude/longitude null) simply can't
  // participate in a distance filter -- they're excluded, not shown with an
  // undefined distance.
  const firms = rows
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      firm: mapFirmRow(r),
      distance: haversineMiles(
        origin.latitude,
        origin.longitude,
        r.latitude as number,
        r.longitude as number,
      ),
    }))
    .filter((r) => r.distance <= LOCATION_RADIUS_MILES)
    .sort((a, b) => a.distance - b.distance)
    .map((r) => r.firm);

  return { firms, locationApplied: true };
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
  searchParams: Promise<{ practiceArea?: string; sort?: string; zip?: string }>;
}) {
  const { city } = await params;
  const { practiceArea, sort: sortParam, zip } = await searchParams;
  const cityRow = await getCity(city);
  if (!cityRow || cityRow.status !== "live") notFound();

  const citySlug = cityRow.slug;
  const sort: SortOption = isSortOption(sortParam) ? sortParam : "rating";

  // A ZIP that fails to geocode (typo, non-US, etc.) falls back to the
  // normal unfiltered/sorted view rather than showing an empty grid --
  // origin stays null and zipError just adds an inline note.
  let origin: { latitude: number; longitude: number } | null = null;
  let zipError = false;
  if (zip) {
    origin = await geocodeZip(zip);
    if (!origin) zipError = true;
  }

  const [{ firms, locationApplied }, practiceAreas] = await Promise.all([
    getFreeFirms(cityRow.id, practiceArea, sort, origin),
    getPracticeAreas(),
  ]);
  // origin was resolvable (ZIP geocoded fine) but the filter itself
  // couldn't apply -- migration 0008 (firms.latitude/longitude) isn't live
  // in the database yet. Distinct from zipError (a bad ZIP): this is a
  // temporary backend gap, not a user input problem.
  const locationUnavailable = origin !== null && !locationApplied;

  // Adjacent-category fallback (UX review Feature Gap #6): a selected chip
  // with zero firms is otherwise a dead end. Only ever looked up once the
  // real query above has already come back empty.
  const activeAreaName = practiceArea
    ? (practiceAreas.find((a) => a.slug === practiceArea)?.name ?? practiceArea)
    : null;

  let fallbackFirms: ListingFirm[] = [];
  let fallbackAreaName: string | null = null;
  if (practiceArea && firms.length === 0 && !locationApplied) {
    const fallbackSlug = getFallbackPracticeArea(practiceArea);
    if (fallbackSlug) {
      const fallbackArea = practiceAreas.find((a) => a.slug === fallbackSlug);
      fallbackAreaName = fallbackArea?.name ?? fallbackSlug;
      fallbackFirms = (
        await getFreeFirms(cityRow.id, fallbackSlug, sort, null)
      ).firms;
    }
  }

  function buildHref({
    practiceArea: nextArea,
    sort: nextSort,
    zip: nextZip,
  }: {
    practiceArea?: string;
    sort?: SortOption;
    zip?: string;
  }) {
    const params = new URLSearchParams();
    if (nextArea) params.set("practiceArea", nextArea);
    if (nextSort && nextSort !== "rating") params.set("sort", nextSort);
    if (nextZip) params.set("zip", nextZip);
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
                href={buildHref({ sort, zip })}
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
                    href={buildHref({ practiceArea: area.slug, sort, zip })}
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

        <div className="flex flex-wrap items-center gap-3">
          {locationApplied ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Within {LOCATION_RADIUS_MILES} mi of {zip}, by distance
              </span>
              <Link
                href={buildHref({ practiceArea, sort })}
                className="text-primary hover:underline"
              >
                Clear
              </Link>
            </div>
          ) : (
            <form
              action={`/${citySlug}/firms`}
              className="flex items-center gap-2"
            >
              {practiceArea && (
                <input type="hidden" name="practiceArea" value={practiceArea} />
              )}
              {sort !== "rating" && (
                <input type="hidden" name="sort" value={sort} />
              )}
              <input
                type="text"
                name="zip"
                defaultValue={zip ?? ""}
                placeholder="ZIP code"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                aria-label="Filter by ZIP code"
                className="h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Search
              </button>
            </form>
          )}

          {!locationApplied && (
            <SortMenu
              active={sort}
              options={(["name", "rating", "reviews"] as SortOption[]).map(
                (option) => ({
                  option,
                  href: buildHref({ practiceArea, sort: option }),
                }),
              )}
            />
          )}
        </div>
      </div>

      {zipError && (
        <p className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
          Couldn&apos;t find that ZIP code — showing all firms instead.
        </p>
      )}
      {locationUnavailable && (
        <p className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
          Location filtering isn&apos;t available yet — showing all firms
          instead.
        </p>
      )}

      {firms.length === 0 ? (
        <>
          {locationApplied ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No firms found within {LOCATION_RADIUS_MILES} miles of {zip}.{" "}
              <Link
                href={buildHref({ practiceArea, sort })}
                className="text-primary hover:underline"
              >
                Clear the location filter
              </Link>{" "}
              to see every firm.
            </p>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              {practiceArea
                ? "No firms match this practice area yet. Try another filter, or "
                : "No firms are listed yet. "}
              <Link
                href="/list-your-firm"
                className="text-primary hover:underline"
              >
                List your firm
              </Link>{" "}
              to be the first.
            </p>
          )}

          {fallbackFirms.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-muted-foreground">
                No {activeAreaName} firms yet — here are {fallbackAreaName}{" "}
                firms who handle {activeAreaName?.toLowerCase()} cases
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fallbackFirms.map((firm) => (
                  <FreeListingCard
                    key={firm.id}
                    firm={firm}
                    citySlug={cityRow.slug}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
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
