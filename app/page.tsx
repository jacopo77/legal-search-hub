import { HOMEPAGE_MODE } from "@/lib/config";
import { CityPageContent } from "@/components/city/city-page-content";
import { NationalHome } from "@/components/home/national-home";

// HOMEPAGE_MODE is the ONLY thing that decides what / renders
// (CLAUDE.md rule 2). Phoenix mode reuses the exact CityPageContent that
// /[city] renders — never a copy — so / and /phoenix are identical.
export default function RootPage() {
  if (HOMEPAGE_MODE === "phoenix") {
    return <CityPageContent citySlug="phoenix" />;
  }
  return <NationalHome />;
}
