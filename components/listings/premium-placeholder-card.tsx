import Link from "next/link";
import { GavelPlaceholderImage } from "./gavel-placeholder-image";

// Placeholder card for an available premium/featured slot.
export function PremiumPlaceholderCard({ cityName }: { cityName: string }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Dark navy image area */}
      <div className="relative aspect-[4/3] w-full">
        <GavelPlaceholderImage />
        <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-navy shadow">
          FEATURED
        </span>
      </div>

      {/* White content area */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-navy">
          Premium Listing Available
        </h3>
        <p className="mt-1 text-sm italic text-gray-500">
          Get your firm seen first by {cityName} clients
        </p>

        <Link
          href="/list-your-firm"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[#3D87C0] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2d6fa0]"
        >
          Claim This Spot →
        </Link>
      </div>
    </li>
  );
}
