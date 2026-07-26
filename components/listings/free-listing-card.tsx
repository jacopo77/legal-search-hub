import Link from "next/link";
import type { ListingFirm } from "./types";
import { FirmLogo } from "./firm-logo";
import { GoogleRatingBadge } from "./google-rating-badge";

// Free tier card: compact horizontal directory card with logo fallback.
export function FreeListingCard({
  firm,
  citySlug,
}: {
  firm: ListingFirm;
  citySlug: string;
}) {
  return (
    <li className="relative rounded-xl border border-border bg-muted/30 transition-colors hover:bg-muted/50">
      <Link
        href={`/${citySlug}/firms/${firm.slug}`}
        className="flex items-start gap-4 p-4"
      >
        <FirmLogo url={firm.logoUrl} name={firm.name} size="sm" />

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight text-foreground hover:text-primary hover:underline">
            {firm.name}
          </h3>

          <div className="mt-1">
            <GoogleRatingBadge
              rating={firm.googleRating}
              reviewCount={firm.googleReviewCount}
            />
          </div>

          {firm.bioShort && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {firm.bioShort}
            </p>
          )}

          {firm.practiceAreas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {firm.practiceAreas.map((area) => (
                <span
                  key={area.slug}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-navy"
                >
                  {area.name}
                </span>
              ))}
            </div>
          )}

          {firm.phone && (
            <p className="mt-2 text-sm font-medium text-navy">{firm.phone}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
