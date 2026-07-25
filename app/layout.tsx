import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SiteNav } from "@/components/nav/site-nav";
import { SiteFooter } from "@/components/nav/site-footer";
import { env } from "@/lib/env";
import "./globals.css";

// NOTE: no next/font/google — it downloads fonts from Google at build time,
// which crashed Vercel's page-data workers silently. System font stack via
// globals.css instead (zero build-time network I/O).

// Site-wide defaults (T22). Pages override title/description; the template
// appends the brand. metadataBase makes og/canonical URLs absolute.
export const metadata: Metadata = {
  metadataBase: new URL(env.site.url()),
  title: {
    default: "Legal Search Hub — Find the right attorney in your city",
    template: "%s | Legal Search Hub",
  },
  description:
    "Find the right attorney in your city — a curated directory of local law firms, searchable by practice area and Google rating.",
  openGraph: {
    siteName: "Legal Search Hub",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/* T24: pageview analytics — active only on Vercel deployments,
            no config needed. No firm-facing dashboard (PRD §5.4). */}
        <Analytics />
      </body>
    </html>
  );
}
