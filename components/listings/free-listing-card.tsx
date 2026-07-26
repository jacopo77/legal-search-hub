import Link from "next/link";
import type { ListingFirm } from "./types";

// Compact free-tier card: circular initial logo, name, practice area, phone.
export function FreeListingCard({
  firm,
  citySlug,
}: {
  firm: ListingFirm;
  citySlug: string;
}) {
  const initial = firm.name.charAt(0).toUpperCase();
  const primaryArea = firm.practiceAreas[0];

  return (
    <li className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold text-navy">
        {initial}
      </div>

      <div className="min-w-0 flex-1">
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
