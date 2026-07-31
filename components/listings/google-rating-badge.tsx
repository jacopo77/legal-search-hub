import { Star } from "lucide-react";

// Cached Google rating badge — trust signal for v1 (CLAUDE.md rule 5: no
// native review system, no star-input, just the cached Google value).
// Always renders a slot, even before google_place_id/GOOGLE_PLACES_API_KEY
// are set up (SESSION-RESUME.md T13 blocker) and every firm's rating is
// still null — a muted "No rating yet" placeholder keeps card/detail
// layouts consistent instead of silently collapsing that space, and reads
// as "not synced yet," not "this firm has zero reviews."
export function GoogleRatingBadge({
  rating,
  reviewCount,
}: {
  rating: number | null;
  reviewCount: number | null;
}) {
  if (rating === null) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Star className="size-4 text-muted-foreground/40" aria-hidden />
        No rating yet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
      {rating.toFixed(1)}
      {reviewCount !== null && (
        <span className="font-normal text-muted-foreground">
          ({reviewCount.toLocaleString()} Google reviews)
        </span>
      )}
    </span>
  );
}
