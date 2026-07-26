import Image from "next/image";
import { Building2 } from "lucide-react";

const sizes = {
  sm: "w-20 h-14",
  md: "w-24 h-16",
  lg: "w-28 h-20",
};

const iconSizes = {
  sm: 24,
  md: 28,
  lg: 32,
};

// Rectangular firm logo/image used by listing cards. Falls back to a generic
// office icon when no logo_url is available.
export function FirmLogo({
  url,
  name,
  size = "md",
}: {
  url: string | null;
  name: string;
  size?: keyof typeof sizes;
}) {
  if (url) {
    return (
      <div
        className={`${sizes[size]} relative shrink-0 overflow-hidden rounded-lg border border-border bg-white`}
      >
        <Image
          src={url}
          alt={`${name} logo`}
          fill
          className="object-contain p-1"
          sizes="(max-width: 640px) 80px, 112px"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-lg border border-border bg-muted`}
      aria-hidden
    >
      <Building2 className="text-muted-foreground/70" size={iconSizes[size]} />
    </div>
  );
}
