import Link from "next/link";
import { Gavel } from "lucide-react";

// Placeholder card for an available premium/featured slot.
export function PremiumPlaceholderCard() {
  return (
    <li className="relative flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
      <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-navy">
        Featured
      </span>

      <div className="flex h-24 w-full items-center justify-center rounded-lg bg-muted">
        <Gavel className="size-10 text-muted-foreground/60" aria-hidden />
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <h3 className="text-lg font-semibold text-foreground">
          Premium Listing Available
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get your firm featured here
        </p>

        <Link
          href="/list-your-firm"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/85"
        >
          Claim This Spot
        </Link>
      </div>
    </li>
  );
}
