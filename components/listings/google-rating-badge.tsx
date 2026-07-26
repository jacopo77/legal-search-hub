import { Star } from "lucide-react";

// Cached Google rating badge — trust signal for v1 (CLAUDE.md rule 5: no
// native review system). Rendered only when a rating has been synced.
export function GoogleRatingBadge({
  rating,
  reviewCount,
}: {
  rating: number | null;
  reviewCount: number | null;
}) {
  if (rating === null) return null;
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
