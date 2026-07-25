import type { Metadata } from "next";

import { HOMEPAGE_MODE } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { CityPageContent } from "@/components/city/city-page-content";
import { NationalHome } from "@/components/home/national-home";

// HOMEPAGE_MODE is the ONLY thing that decides what / renders
// (CLAUDE.md rule 2). Phoenix mode reuses the exact CityPageContent that
// /[city] renders — never a copy — so / and /phoenix are identical,
// including ?q= / ?practiceArea= search behavior.
export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; practiceArea?: string }>;
}) {
  if (HOMEPAGE_MODE === "phoenix") {
    return (
      <CityPageContent citySlug="phoenix" searchParams={await searchParams} />
    );
  }
  return <NationalHome />;
}

// Root metadata follows the same mode switch (T22): in phoenix mode /
// renders the Phoenix city page, so its tags mirror /phoenix; in national
// mode the layout default (which describes the directory) already fits.
export async function generateMetadata(): Promise<Metadata> {
  if (HOMEPAGE_MODE !== "phoenix") return {};

  const supabase = await createClient();
  const { data: city } = await supabase
    .from("cities")
    .select("name, state, status")
    .eq("slug", "phoenix")
    .maybeSingle();
  if (!city || city.status !== "live") return {};

  const title = `${city.name}, ${city.state} Attorneys & Law Firms`;
  return {
    title,
    description: `Compare ${city.name} law firms by practice area and Google rating. Find the right ${city.name}, ${city.state} attorney for your situation.`,
    alternates: { canonical: "/" },
    openGraph: { title },
  };
}
