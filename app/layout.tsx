import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/nav/site-nav";
import { SiteFooter } from "@/components/nav/site-footer";
import { env } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
