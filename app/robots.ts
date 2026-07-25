import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// Robots (T22): everything public is crawlable — including /company, which
// is unlinked from nav but must stay indexable. Admin/auth/api paths are
// excluded; they carry no search value and /admin 404s for non-admins
// anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/auth/", "/sign-in"],
    },
    sitemap: `${env.site.url()}/sitemap.xml`,
  };
}
