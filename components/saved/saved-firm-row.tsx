import Link from "next/link";
import { GoogleRatingBadge } from "@/components/listings/google-rating-badge";
import { SaveButton } from "./save-button";
import type { SavedFirmSummary } from "./types";

export function SavedFirmRow({ firm }: { firm: SavedFirmSummary }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <p className="font-semibold">
          {firm.citySlug ? (
            <Link
              href={`/${firm.citySlug}/firms/${firm.slug}`}
              className="hover:text-primary hover:underline"
            >
              {firm.name}
            </Link>
          ) : (
            firm.name
          )}
        </p>
        {firm.cityName && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {firm.cityName}
          </p>
        )}
        <div className="mt-1">
          <GoogleRatingBadge
            rating={firm.googleRating}
            reviewCount={firm.googleReviewCount}
            googlePlaceId={firm.googlePlaceId}
          />
        </div>
      </div>
      <SaveButton firmId={firm.id} variant="labeled" className="shrink-0" />
    </li>
  );
}
