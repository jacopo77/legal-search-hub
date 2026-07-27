import Link from "next/link";
import type { ListingFirm } from "./types";
import { FirmLogoPlaceholder } from "./firm-logo-placeholder";
import { StatusBadge } from "./status-badge";
import { ShimmerImage } from "@/components/ui/shimmer-image";

// Compact free-tier card: top logo/SVG placeholder area, then name, practice
// area, and phone below.
export function FreeListingCard({
  firm,
  citySlug,
}: {
  firm: ListingFirm;
  citySlug: string;
}) {
  const primaryArea = firm.practiceAreas[0];
  const showClaimBadge = firm.ownerId === null && !firm.claimBadgeHidden;
  const showPremiumBadge = firm.premiumBadge;

  // Firm has a real logo — standard card with name linking to detail page.
  if (firm.logoUrl) {
    return (
      <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
        <div className="relative aspect-[4/3] w-full bg-gray-100">
          {showClaimBadge && <StatusBadge variant="claim" />}
          {showPremiumBadge && <StatusBadge variant="premium" />}
          <ShimmerImage
            src={firm.logoUrl}
            alt={`${firm.name} logo`}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        </div>

        <div className="p-4">
          <h3 className="font-semibold leading-tight">
            <Link
              href={`/${citySlug}/firms/${firm.slug}`}
              className="text-foreground hover:text-primary hover:underline"
            >
              {firm.name}
            </Link>
          </h3>

          {primaryArea && (
            <p className="text-sm italic text-gray-500">{primaryArea.name}</p>
          )}

          {firm.phone && (
            <p className="mt-1 text-sm font-medium text-navy">{firm.phone}</p>
          )}

          {firm.bioShort && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {firm.bioShort}
            </p>
          )}
        </div>
      </li>
    );
  }

  // Placeholder card — entire surface links to /list-your-firm.
  return (
    <li>
      <Link
        href="/list-your-firm"
        className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
      >
        <div className="relative aspect-[4/3] w-full bg-gray-100">
          {showClaimBadge && <StatusBadge variant="claim" />}
          {showPremiumBadge && <StatusBadge variant="premium" />}
          <FirmLogoPlaceholder firmName={firm.name} practiceArea={primaryArea?.name} />
        </div>

        <div className="p-4">
          <h3 className="font-semibold leading-tight text-foreground group-hover:text-primary group-hover:underline">
            {firm.name}
          </h3>

          {primaryArea && (
            <p className="text-sm italic text-gray-500">{primaryArea.name}</p>
          )}

          {firm.phone && (
            <p className="mt-1 text-sm font-medium text-navy">{firm.phone}</p>
          )}

          {firm.bioShort && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {firm.bioShort}
            </p>
          )}

          <span className="mt-3 block rounded-lg bg-amber-500/10 px-4 py-2 text-xl font-bold text-amber-500 transition-colors group-hover:bg-amber-500/20 group-hover:underline">
            Claim Your Profile →
          </span>
        </div>
      </Link>
    </li>
  );
}
