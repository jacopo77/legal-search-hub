import Link from "next/link";
import Image from "next/image";
import { Phone } from "lucide-react";
import type { ListingFirm } from "./types";
import { GoogleRatingBadge } from "./google-rating-badge";

// Premium tier card: logo, distinct elevated styling, top placement.
export function PremiumListingCard({
  firm,
  citySlug,
}: {
  firm: ListingFirm;
  citySlug: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {firm.logoUrl && (
          <Image
            src={firm.logoUrl}
            alt={`${firm.name} logo`}
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-lg border border-border object-contain"
          />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-lg font-semibold">
              <Link
                href={`/${citySlug}/firms/${firm.slug}`}
                className="hover:text-navy hover:underline"
              >
                {firm.name}
              </Link>
            </h3>
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-navy">
              Featured
            </span>
          </div>
          <GoogleRatingBadge
            rating={firm.googleRating}
            reviewCount={firm.googleReviewCount}
          />
        </div>
      </div>

      {firm.bioShort && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {firm.bioShort}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {firm.practiceAreas.map((area) => (
          <Link
            key={area.slug}
            href={`/${citySlug}?practiceArea=${area.slug}`}
            className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium hover:bg-muted/70"
          >
            {area.name}
          </Link>
        ))}
      </div>

      {firm.phone && (
        <a
          href={`tel:${firm.phone.replace(/[^0-9+]/g, "")}`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline"
        >
          <Phone className="size-4" aria-hidden />
          {firm.phone}
        </a>
      )}
    </li>
  );
}
