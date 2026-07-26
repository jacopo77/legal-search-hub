import Link from "next/link";
import type { ListingFirm } from "./types";
import { FirmLogo } from "./firm-logo";
import { GoogleRatingBadge } from "./google-rating-badge";

// Premium tier card: elevated horizontal layout with left accent border,
// larger logo box, and a "Featured" badge.
export function PremiumListingCard({
  firm,
  citySlug,
}: {
  firm: ListingFirm;
  citySlug: string;
}) {
  return (
    <li className="relative rounded-xl border border-border border-l-4 border-l-navy bg-card shadow-sm transition-colors hover:bg-muted/30">
      <Link
        href={`/${citySlug}/firms/${firm.slug}`}
        className="flex items-start gap-4 p-5"
      >
        <FirmLogo url={firm.logoUrl} name={firm.name} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold leading-tight text-foreground hover:text-primary hover:underline">
              {firm.name}
            </h3>
            <span className="shrink-0 rounded-full bg-brand-red px-2 py-0.5 text-xs font-semibold text-white">
              Featured
            </span>
          </div>

          <div className="mt-1">
            <GoogleRatingBadge
              rating={firm.googleRating}
              reviewCount={firm.googleReviewCount}
            />
          </div>

          {firm.bioShort && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {firm.bioShort}
            </p>
          )}

          {firm.practiceAreas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {firm.practiceAreas.map((area) => (
                <span
                  key={area.slug}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-navy"
                >
                  {area.name}
                </span>
              ))}
            </div>
          )}

          {firm.phone && (
            <p className="mt-3 text-sm font-medium text-navy">{firm.phone}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
