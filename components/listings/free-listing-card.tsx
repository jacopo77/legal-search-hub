import Link from "next/link";
import Image from "next/image";
import type { ListingFirm } from "./types";
import { FirmLogoPlaceholder } from "./firm-logo-placeholder";

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

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {firm.logoUrl ? (
          <Image
            src={firm.logoUrl}
            alt={`${firm.name} logo`}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <FirmLogoPlaceholder firmName={firm.name} />
        )}
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
          <span className="mt-1 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-navy">
            {primaryArea.name}
          </span>
        )}

        {firm.phone && (
          <p className="mt-1 text-sm font-medium text-navy">{firm.phone}</p>
        )}
      </div>
    </li>
  );
}
