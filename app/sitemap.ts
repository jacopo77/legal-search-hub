import type { MetadataRoute } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

// Sitemap (T22): static pages + every live city + every live firm. Uses the
// service-role client (not the cookie client) so this handler stays
// cacheable — reading cookies would force it dynamic on every request.
// Only public data (live rows) is selected.
export const revalidate = 3600;

type SitemapFirmRow = {
  slug: string;
  updated_at: string;
  cities: { slug: string } | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.site.url();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    // Deliberately included though unlinked from nav — /company must be
    // crawlable and indexable (T22 acceptance criterion).
    { url: `${base}/company`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/list-your-firm`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const supabase = createAdminClient();
  const [{ data: cities }, { data: firms }] = await Promise.all([
    supabase
      .from("cities")
      .select("slug")
      .eq("status", "live")
      .order("sort_order"),
    supabase
      .from("firms")
      // !inner + the embedded filter keep firms in coming_soon cities out
      // of the sitemap — their pages 404 until the city goes live.
      .select("slug, updated_at, cities!inner(slug)")
      .eq("status", "live")
      .eq("cities.status", "live"),
  ]);

  const cityRoutes: MetadataRoute.Sitemap = (cities ?? []).map((city) => ({
    url: `${base}/${city.slug}`,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const firmRoutes: MetadataRoute.Sitemap = (
    (firms ?? []) as unknown as SitemapFirmRow[]
  )
    .filter((firm) => firm.cities?.slug)
    .map((firm) => ({
      url: `${base}/${firm.cities!.slug}/firms/${firm.slug}`,
      lastModified: firm.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [...staticRoutes, ...cityRoutes, ...firmRoutes];
}
