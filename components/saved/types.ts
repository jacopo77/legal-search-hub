// Shared shape for a saved-firm summary row, used by both the signed-in
// Server Component list (app/saved/page.tsx) and the signed-out client list
// (saved-firms-local-list.tsx) that resolves localStorage IDs via
// /api/firms/lookup — one render component (SavedFirmRow) serves both.
export type SavedFirmSummary = {
  id: string;
  slug: string;
  name: string;
  tier: "free" | "premium";
  googleRating: number | null;
  googleReviewCount: number | null;
  googlePlaceId: string | null;
  citySlug: string | null;
  cityName: string | null;
};
