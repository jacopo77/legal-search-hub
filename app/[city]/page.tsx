import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { CityPageContent } from "@/components/city/city-page-content";

// The ONE city page template — /phoenix today, any future city via a
// cities row, never a new route file (CLAUDE.md rule 1).
export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ q?: string; practiceArea?: string }>;
}) {
  const { city } = await params;
  return <CityPageContent citySlug={city} searchParams={await searchParams} />;
}

// Per-city metadata (T22). Only live cities get tailored tags — anything
// else falls back to the layout default and 404s in the page render.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const supabase = await createClient();
  const { data: city } = await supabase
    .from("cities")
    .select("slug, name, state, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!city || city.status !== "live") return {};

  const title = `${city.name}, ${city.state} Attorneys & Law Firms`;
  return {
    title,
    description: `Compare ${city.name} law firms by practice area and Google rating. Find the right ${city.name}, ${city.state} attorney for your situation.`,
    alternates: { canonical: `/${city.slug}` },
    openGraph: { title },
  };
}
