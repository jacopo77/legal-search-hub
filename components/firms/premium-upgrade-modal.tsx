"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type BillingInterval = "monthly" | "annual";

const BENEFITS = [
  "Featured placement in your practice area and city",
  "Verified badge on your firm profile",
  "Client inquiries routed directly to your inbox",
  "Detailed profile analytics",
  "Priority support",
];

const PRICE_CONFIG: Record<
  BillingInterval,
  { price: string; period: string; subtext: string }
> = {
  monthly: {
    price: "$29",
    period: "/month",
    subtext: "Billed monthly. Cancel anytime.",
  },
  annual: {
    price: "$299",
    period: "/year",
    subtext: "Billed annually. Cancel anytime.",
  },
};

export function PremiumUpgradeModal({ firmId }: { firmId: string }) {
  const [open, setOpen] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const config = PRICE_CONFIG[interval];

  return (
    <>
      <Button onClick={() => setOpen(true)}>Upgrade to Premium</Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-xl bg-[#FAF8F5] shadow-xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 rounded-md p-1 text-[#666666] hover:bg-black/5"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="p-8 pb-6">
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8B7355]">
                  Premium Listing
                </p>
                <h2 className="font-serif text-[26px] font-normal leading-tight text-[#1a1a1a]">
                  Stand out to the clients searching for you
                </h2>
                <p className="text-sm leading-6 text-[#666666]">
                  Here&apos;s what premium costs and includes. You can review this
                  before starting your listing details.
                </p>
              </div>

              {/* Billing toggle */}
              <div className="mt-6 flex items-center gap-1 rounded-lg border border-[#E5E0D8] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setInterval("monthly")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    interval === "monthly"
                      ? "bg-[#1E3A5F] text-white shadow-sm"
                      : "text-[#666666] hover:text-[#1a1a1a]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setInterval("annual")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    interval === "annual"
                      ? "bg-[#1E3A5F] text-white shadow-sm"
                      : "text-[#666666] hover:text-[#1a1a1a]"
                  }`}
                >
                  Annual
                </button>
                <span className="mr-2 rounded-full bg-[#F5E6C8] px-2.5 py-0.5 text-xs font-bold text-[#8B7355]">
                  Save 14%
                </span>
              </div>

              {/* Price */}
              <div className="mt-6">
                <p className="flex items-baseline gap-1">
                  <span className="font-serif text-5xl font-normal text-[#1a1a1a]">
                    {config.price}
                  </span>
                  <span className="text-base text-[#666666]">{config.period}</span>
                </p>
                <p className="mt-1.5 text-sm text-[#666666]">{config.subtext}</p>
              </div>

              {/* Benefits */}
              <ul className="mt-6 space-y-3">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-[#444444]">
                    <span className="mt-0.5 shrink-0 text-[#8B7355]">&#10003;</span>
                    <span className="leading-5">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA + fine print */}
            <form
              action="/api/billing/checkout"
              method="POST"
              className="border-t border-[#E5E0D8] bg-white p-8"
            >
              <input type="hidden" name="firmId" value={firmId} />
              <input type="hidden" name="plan" value={interval} />
              <Button
                type="submit"
                className="w-full bg-[#8B7355] text-white hover:bg-[#7A6548]"
              >
                Continue to listing details
              </Button>
              <p className="mt-3 text-center text-xs text-[#888888]">
                Prorated automatically if you&apos;re upgrading mid-cycle.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
