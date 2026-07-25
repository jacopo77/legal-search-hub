import type { Metadata } from "next";
import { NationalHome } from "@/components/home/national-home";

// /company always renders the national homepage regardless of
// HOMEPAGE_MODE (CLAUDE.md rule 2). Deliberately unlinked from SiteNav
// for now — built and crawlable for SEO, surfaced later (T22 confirms).
export const metadata: Metadata = {
  title: "Find the right attorney in your city",
  description:
    "Legal Search Hub is a curated directory of local law firms. Browse by city and compare firms by practice area and Google rating.",
};

export default function CompanyPage() {
  return <NationalHome />;
}
