import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { FirmDetail } from "@/components/firms/firm-detail";

// Firm detail page — /[city]/firms/[slug]. Thin wrapper; all logic lives in
// the shared FirmDetail component. `checkout` is the status Stripe sent the
// owner back with after an upgrade attempt (T18).
export default async function FirmDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ city, slug }, { checkout }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <FirmDetail citySlug={city} firmSlug={slug} checkoutStatus={checkout} />
  );
}

// Per-firm metadata (T22). Only live firms get tailored tags — anything
// else falls back to the layout default and 404s in the page render.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city: citySlug, slug } = await params;
  const supabase = await createClient();
  const { data: city } = await supabase
    .from("cities")
    .select("id, name, state, status")
    .eq("slug", citySlug)
    .maybeSingle();
  if (!city || city.status !== "live") return {};

  const { data: firm } = await supabase
    .from("firms")
    .select("name, slug, bio_short, bio_long, owner_id, tier")
    .eq("city_id", city.id)
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  if (!firm) return {};

  // Thin/unclaimed noindex: a listing is thin only when ALL three signals
  // agree — never claimed, still free tier, and no bio at all. Any one of
  // claim, premium upgrade, or a saved bio (BioEditForm/PremiumEditForm)
  // flips this back to indexable automatically; no manual toggle. Deliberately
  // AND, not OR — most seeded firms are unclaimed+free at launch, and an
  // OR here would noindex the whole catalog rather than just the bare ones.
  const isThin =
    firm.owner_id === null &&
    firm.tier === "free" &&
    !firm.bio_short &&
    !firm.bio_long;

  return {
    title: `${firm.name} — ${city.name}, ${city.state}`,
    description:
      firm.bio_short ??
      `${firm.name} is a law firm in ${city.name}, ${city.state}, listed on Legal Search Hub.`,
    alternates: { canonical: `/${citySlug}/firms/${firm.slug}` },
    openGraph: { title: firm.name },
    ...(isThin ? { robots: { index: false, follow: true } } : {}),
  };
}
