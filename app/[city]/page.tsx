import { CityPageContent } from "@/components/city/city-page-content";

// The ONE city page template — /phoenix today, any future city via a
// cities row, never a new route file (CLAUDE.md rule 1).
export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <CityPageContent citySlug={city} />;
}
