import Link from "next/link";
import type { ListingFirm } from "./types";
import { FirmLogoPlaceholder } from "./firm-logo-placeholder";
import { StatusBadge } from "./status-badge";
import { GoogleRatingBadge } from "./google-rating-badge";
import { ShimmerImage } from "@/components/ui/shimmer-image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Compact free-tier card: top logo/placeholder image area, then name,
// practice area, phone, bio, and a View Profile CTA below. One structure
// for every firm — only the image area differs (real photo vs the navy
// FirmLogoPlaceholder) — so a firm's card never looks or behaves
// differently just because it hasn't uploaded a logo yet. The name and
// CTA always link to the firm's own detail page, never a generic signup
// page, regardless of claim status (the claim/edit flow lives on that
// detail page itself, signaled here by the CLAIM badge).
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
  const firmPath = `/${citySlug}/firms/${firm.slug}`;

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {showClaimBadge && <StatusBadge variant="claim" />}
        {showPremiumBadge && <StatusBadge variant="premium" />}
        {firm.logoUrl ? (
          <ShimmerImage
            src={firm.logoUrl}
            alt={`${firm.name} logo`}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <FirmLogoPlaceholder
            firmName={firm.name}
            practiceArea={primaryArea?.name}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold leading-tight">
          <Link
            href={firmPath}
            className="text-foreground hover:text-primary hover:underline"
          >
            {firm.name}
          </Link>
        </h3>

        {primaryArea && (
          <p className="text-sm italic text-gray-500">{primaryArea.name}</p>
        )}

        <div className="mt-1">
          <GoogleRatingBadge
            rating={firm.googleRating}
            reviewCount={firm.googleReviewCount}
            googlePlaceId={firm.googlePlaceId}
          />
        </div>

        {firm.phone && (
          <p className="mt-1 text-sm font-medium text-navy">{firm.phone}</p>
        )}

        {firm.bioShort ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {firm.bioShort}
          </p>
        ) : (
          firm.address && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {firm.address}
            </p>
          )
        )}

        <Link
          href={firmPath}
          className={cn(
            buttonVariants({ variant: "outline-navy" }),
            "mt-auto w-full px-4 py-2 text-sm font-semibold",
          )}
        >
          View Profile →
        </Link>
      </div>
    </li>
  );
}
