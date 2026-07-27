import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FreeListingCard } from "@/components/listings/free-listing-card";
import { mapFirmRow, type FirmRow } from "@/components/listings/types";

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

async function getFreeFirms(cityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("firms")
    .select(
      `id, slug, name, tier, phone, address, bio_short, logo_url,
       google_rating, google_review_count,
       owner_id, claim_badge_hidden, premium_badge,
       firm_practice_areas(practice_areas(slug, name))`,
    )
    .eq("city_id", cityId)
    .eq("status", "live")
    .eq("tier", "free")
    .order("name", { ascending: true });
  if (error) {
    console.error("AllFirmsPage: free firms query failed", error);
    return [];
  }
  return (data as unknown as FirmRow[]).map(mapFirmRow);
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
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const cityRow = await getCity(city);
  if (!cityRow || cityRow.status !== "live") notFound();

  const firms = await getFreeFirms(cityRow.id);

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

      {firms.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No firms are listed yet.{" "}
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
