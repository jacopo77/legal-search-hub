import Link from "next/link";
import type { ListingFirm } from "./types";
import { StatusBadge } from "./status-badge";
import { FirmLogoPlaceholder } from "./firm-logo-placeholder";
import { ShimmerImage } from "@/components/ui/shimmer-image";

// Premium/featured firm card: elevated layout. The PREMIUM status badge
// (top-right of the image, see status-badge.tsx) replaces the old amber
// "Featured" pill.
export function PremiumListingCard({
  firm,
  citySlug,
}: {
  firm: ListingFirm;
  citySlug: string;
}) {
  const primaryArea = firm.practiceAreas[0];
  const showClaimBadge = firm.ownerId === null && !firm.claimBadgeHidden;
  const showPremiumBadge = firm.premiumBadge;

  return (
    <li className="relative flex flex-col rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="relative flex h-32 w-full items-center justify-center rounded-lg bg-gray-100">
        {showClaimBadge && <StatusBadge variant="claim" />}
        {showPremiumBadge && <StatusBadge variant="premium" />}
        {firm.logoUrl ? (
          <div className="relative h-28 w-full">
            <ShimmerImage
              src={firm.logoUrl}
              alt={`${firm.name} logo`}
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </div>
        ) : (
          <FirmLogoPlaceholder firmName={firm.name} practiceArea={primaryArea?.name} />
        )}
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="text-xl font-semibold text-foreground">
          <Link
            href={`/${citySlug}/firms/${firm.slug}`}
            className="hover:text-primary hover:underline"
          >
            {firm.name}
          </Link>
        </h3>

        {primaryArea && (
          <span className="mt-1 inline-block self-start rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-navy">
            {primaryArea.name}
          </span>
        )}

        {firm.phone && (
          <p className="mt-2 text-sm font-medium text-navy">{firm.phone}</p>
        )}

        {firm.bioShort && (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {firm.bioShort}
          </p>
        )}

        <Link
          href={`/${citySlug}/firms/${firm.slug}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/85"
        >
          View Profile
        </Link>
      </div>
    </li>
  );
}
