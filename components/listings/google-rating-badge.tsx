import { Star } from "lucide-react";

// Cached Google rating badge — trust signal for v1 (CLAUDE.md rule 5: no
// native review system). Always renders so cards never look incomplete.
export function GoogleRatingBadge({
  rating,
  reviewCount,
}: {
  rating: number | null;
  reviewCount: number | null;
}) {
  if (rating === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span className="inline-flex gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="size-4 text-muted-foreground/60"
              strokeWidth={1.5}
            />
          ))}
        </span>
        Not yet rated
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
