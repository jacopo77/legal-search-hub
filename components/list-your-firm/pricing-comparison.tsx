import Link from "next/link";
import { Check, Minus } from "lucide-react";

type Row = {
  label: string;
  free: string | boolean;
  premium: string | boolean;
};

// Feature diff kept in sync with what's actually gated by firms.tier —
// see components/firms/firm-detail.tsx (gallery, multiple practice areas,
// "Contact this firm" form are premium-only) and CLAUDE.md's badge section
// (PREMIUM badge + Featured Listings placement). Logo upload and long-bio
// editing were opened to free tier (see docs/SESSION-RESUME.md) so both
// columns show them included rather than as a premium differentiator.
const ROWS: Row[] = [
  { label: "Directory listing, reviewed before going live", free: true, premium: true },
  { label: "Practice areas", free: "1", premium: "Unlimited" },
  { label: "Logo upload", free: true, premium: true },
  { label: "Long-form bio / About section", free: true, premium: true },
  { label: "Photo gallery", free: false, premium: true },
  { label: "PREMIUM badge + Featured Listings placement", free: false, premium: true },
  { label: '"Contact This Firm" lead form', free: false, premium: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto size-4 text-primary" aria-label="Included" />
    ) : (
      <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="Not included" />
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}

// Static price display — matches the live Stripe monthly price. Annual
// billing ($299/yr) exists as a price point but isn't wired into Checkout
// yet (docs/TASKS.md T29), so it's deliberately not shown here.
export function PricingComparison() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-3">
        <div className="flex items-end p-4 pb-3">
          <span className="text-sm font-semibold text-muted-foreground">
            Compare plans
          </span>
        </div>
        <div className="border-l border-border bg-muted/30 p-4 text-center">
          <p className="text-sm font-semibold">Free</p>
          <p className="mt-1 text-2xl font-bold">$0</p>
        </div>
        <div className="border-l border-border bg-[#1E3A5F] p-4 text-center text-white">
          <p className="text-sm font-semibold text-[#FBBF24]">Premium</p>
          <p className="mt-1 text-2xl font-bold">
            $29<span className="text-sm font-normal text-white/70">/mo</span>
          </p>
        </div>
      </div>

      {ROWS.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-3 border-t border-border"
        >
          <div className="p-4 text-sm">{row.label}</div>
          <div className="flex items-center justify-center border-l border-border p-4">
            <Cell value={row.free} />
          </div>
          <div className="flex items-center justify-center border-l border-border bg-muted/10 p-4">
            <Cell value={row.premium} />
          </div>
        </div>
      ))}

      <div className="grid grid-cols-3 border-t border-border">
        <div className="p-4" />
        <div className="border-l border-border p-4 text-center">
          <Link
            href="/list-your-firm#signup-form"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Get started free ↓
          </Link>
        </div>
        <div className="border-l border-border bg-muted/10 p-4 text-center">
          <Link
            href="/list-your-firm#signup-form"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Sign up, upgrade anytime ↓
          </Link>
        </div>
      </div>
    </div>
  );
}
