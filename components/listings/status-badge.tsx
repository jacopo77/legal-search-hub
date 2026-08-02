// CLAIM / PREMIUM listing badges (docs/DESIGN-BADGES.md). Overlaid on the
// card image area — works identically over a real logo/photo or the
// generated SVG placeholder, since it's just an absolutely-positioned
// layer on top.
//
// Chamfered corners use clip-path, which clips away any CSS border along
// with the box — so the white border is faked with two nested clipped
// layers: an outer white layer (the border) and an inner layer inset by
// the border width, clipped with the same polygon, holding the fill color
// and the label.
const CHAMFER = 5; // px cut on each corner

// Percentage-relative on both axes (via calc) so the cut stays correct
// regardless of the badge's actual rendered width, which is content-driven
// (padding around the label), not a fixed value.
function chamferPolygon(cut: number): string {
  return `polygon(${cut}px 0, calc(100% - ${cut}px) 0, 100% ${cut}px, 100% calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, ${cut}px 100%, 0 calc(100% - ${cut}px), 0 ${cut}px)`;
}

const VARIANTS = {
  premium: {
    label: "PREMIUM",
    background: "#1E3A5F",
    color: "#FBBF24",
    ariaLabel: "Premium listing",
    position: "right-2",
  },
} as const;

const BADGE_HEIGHT = 24;
const BORDER = 1.5;

export function StatusBadge({ variant }: { variant: keyof typeof VARIANTS }) {
  const { label, background, color, ariaLabel, position } = VARIANTS[variant];

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={`absolute top-2 z-10 ${position} inline-block`}
      style={{
        height: BADGE_HEIGHT,
        clipPath: chamferPolygon(CHAMFER),
        background: "#FFFFFF",
      }}
    >
      <span
        className="flex h-full items-center px-2.5 text-[11px] font-bold tracking-wide uppercase"
        style={{
          margin: BORDER,
          height: BADGE_HEIGHT - BORDER * 2,
          background,
          color,
          clipPath: chamferPolygon(CHAMFER - BORDER),
        }}
      >
        {label}
      </span>
    </span>
  );
}
