import { createClient } from "@/lib/supabase/server";
import {
  mapFirmRow,
  type FirmRow,
  type ListingFirm,
} from "@/components/listings/types";

// City-scoped search queries (ARCHITECTURE.md §8). Two modes:
//  - text search via the search_firms RPC (tsvector + pg_trgm, see
//    db/migrations/0002_search.sql)
//  - practice-area chip filtering via the join table (plain filter links,
//    not text search)
// Both always filter status = 'live' here in the query layer.

// Untyped until `supabase gen types` (see lib/supabase/server.ts TODO).
type SearchFirmRow = Omit<FirmRow, "firm_practice_areas">;

const FIRM_FIELDS =
  "id, slug, name, tier, phone, address, bio_short, logo_url, google_rating, google_review_count, google_place_id, premium_badge";

// The RPC returns firms without the practice-area join; fetch the links for
// the result set in one follow-up query and reattach.
async function attachPracticeAreas(
  rows: SearchFirmRow[],
): Promise<ListingFirm[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const { data: links, error } = await supabase
    .from("firm_practice_areas")
    .select("firm_id, practice_areas(slug, name)")
    .in("firm_id", ids);
  if (error) {
    console.error("attachPracticeAreas: query failed", error);
    return rows.map((row) => mapFirmRow({ ...row, firm_practice_areas: [] }));
  }
  const byFirm = new Map<
    string,
    { practice_areas: { slug: string; name: string } | null }[]
  >();
  for (const link of links ?? []) {
    const list = byFirm.get(link.firm_id) ?? [];
    list.push({
      practice_areas: link.practice_areas as unknown as {
        slug: string;
        name: string;
      } | null,
    });
    byFirm.set(link.firm_id, list);
  }
  return rows.map((row) =>
    mapFirmRow({ ...row, firm_practice_areas: byFirm.get(row.id) ?? [] }),
  );
}

export async function searchFirms(
  cityId: string,
  query: string,
  // Optional: narrows text-search results to firms tagged with this
  // practice area, so the search box and the category chip compose instead
  // of the chip's selection being silently discarded. Applied in JS after
  // the RPC rather than in SQL — the search_firms RPC has no practice-area
  // parameter, and attachPracticeAreas already fetches the tags this needs.
  practiceAreaSlug?: string,
): Promise<ListingFirm[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("search_firms", { p_city_id: cityId, p_query: query })
    .select(FIRM_FIELDS);
  if (error) {
    console.error("searchFirms: rpc failed", error);
    return [];
  }
  const firms = await attachPracticeAreas(
    (data ?? []) as unknown as SearchFirmRow[],
  );
  return practiceAreaSlug
    ? firms.filter((firm) =>
        firm.practiceAreas.some((area) => area.slug === practiceAreaSlug),
      )
    : firms;
}

export async function firmsByPracticeArea(
  cityId: string,
  practiceAreaSlug: string,
): Promise<ListingFirm[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("firms")
    .select(
      `${FIRM_FIELDS},
       firm_practice_areas!inner(practice_areas!inner(slug, name))`,
    )
    .eq("city_id", cityId)
    .eq("status", "live")
    .eq("firm_practice_areas.practice_areas.slug", practiceAreaSlug)
    .order("tier", { ascending: false }) // premium first
    .order("google_rating", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) {
    console.error("firmsByPracticeArea: query failed", error);
    return [];
  }
  return (data as unknown as FirmRow[]).map(mapFirmRow);
}
