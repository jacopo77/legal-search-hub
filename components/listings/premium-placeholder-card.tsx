import Link from "next/link";
import { GavelPlaceholderImage } from "./gavel-placeholder-image";

// Placeholder card for an available premium/featured slot.
export function PremiumPlaceholderCard() {
  return (
    <li className="relative flex flex-col rounded-xl border border-border bg-card p-8 shadow-sm">
      <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-navy shadow">
        Featured
      </span>

      <div className="relative h-32 w-full overflow-hidden rounded-lg">
        <GavelPlaceholderImage />
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="text-xl font-semibold text-foreground">
          Premium Listing Available
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get your firm featured here
        </p>

        <Link
          href="/list-your-firm"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/85"
        >
          Claim This Spot
        </Link>
      </div>
    </li>
  );
}
