import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { ShimmerImage } from "@/components/ui/shimmer-image";

// Three curated building photos, cycled by index so multiple empty
// premium slots on the same page don't repeat the same image.
const PREMIUM_PROMO_IMAGES = [
  "/premium/OIG3.jpg",
  "/premium/OIG4.jpg",
  "/premium/premium3.jpg",
];

// Placeholder card for an available premium/featured slot — shown only
// when fewer than 3 real premium firms exist for the city (see
// ListingSection). Full-bleed building photo with a dark gradient so the
// white headline/CTA stay readable regardless of the image's own
// brightness, plus the same navy/gold PREMIUM badge real premium cards use.
export function PremiumPlaceholderCard({
  imageIndex = 0,
}: {
  imageIndex?: number;
}) {
  const image =
    PREMIUM_PROMO_IMAGES[imageIndex % PREMIUM_PROMO_IMAGES.length];

  return (
    <li className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border shadow-sm">
      <ShimmerImage
        src={image}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 33vw"
      />

      {/* Dark gradient, darkest at the bottom where the text sits, so white
          text stays readable regardless of the photo's own brightness. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/35 to-black/8"
      />

      <StatusBadge variant="premium" />

      <div className="relative flex h-full flex-col justify-end p-6 text-white">
        <h3 className="text-xl font-bold tracking-tight">
          Feature Your Firm Here
        </h3>
        <p className="mt-1 text-sm text-white/85">
          Get premium visibility for your practice
        </p>
        <Link
          href="/list-your-firm#signup-form"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/85"
        >
          Claim This Premium Spot →
        </Link>
      </div>
    </li>
  );
}
