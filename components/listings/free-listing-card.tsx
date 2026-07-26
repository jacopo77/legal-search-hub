import Link from "next/link";
import { Phone } from "lucide-react";
import type { ListingFirm } from "./types";
import { GoogleRatingBadge } from "./google-rating-badge";

// Free tier card: the standard directory card — no logo, no premium styling.
export function FreeListingCard({
  firm,
  citySlug,
}: {
  firm: ListingFirm;
  citySlug: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-muted/30 p-5">
      <h3 className="font-semibold">
        <Link
          href={`/${citySlug}/firms/${firm.slug}`}
          className="hover:text-navy hover:underline"
        >
          {firm.name}
        </Link>
      </h3>
      <GoogleRatingBadge
        rating={firm.googleRating}
        reviewCount={firm.googleReviewCount}
      />

      {firm.bioShort && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {firm.bioShort}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
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
