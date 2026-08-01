import { Star } from "lucide-react";

// Cached Google rating badge — trust signal for v1 (CLAUDE.md rule 5: no
// native review system, no star-input, just the cached Google value).
// Always renders a slot, even before google_place_id/GOOGLE_PLACES_API_KEY
// are set up (SESSION-RESUME.md T13 blocker) and every firm's rating is
// still null — a muted "No rating yet" placeholder keeps card/detail
// layouts consistent instead of silently collapsing that space, and reads
// as "not synced yet," not "this firm has zero reviews."
//
// Clickable when a googlePlaceId is available (UX review): links out to the
// place's own Google Maps page, where the actual reviews live — we only
// ever cache the aggregate rating/count, never review text (rule 5), so
// "read a review" has to leave the site. Falls back to plain (non-link)
// text when no place id is on file, same as the no-rating state.
export function GoogleRatingBadge({
  rating,
  reviewCount,
  googlePlaceId,
}: {
  rating: number | null;
  reviewCount: number | null;
  googlePlaceId?: string | null;
}) {
  if (rating === null) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Star className="size-4 text-muted-foreground/40" aria-hidden />
        No rating yet
      </span>
    );
  }
  const content = (
    <>
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
      {rating.toFixed(1)}
      {reviewCount !== null && (
        <span className="font-normal text-muted-foreground group-hover:underline">
          ({reviewCount.toLocaleString()} Google reviews)
        </span>
      )}
    </>
  );
  if (googlePlaceId) {
    return (
      <a
        href={`https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
      >
        {content}
      </a>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
      {content}
    </span>
  );
}
