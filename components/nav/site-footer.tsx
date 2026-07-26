import Image from "next/image";
import { COMPANY_NAP } from "@/lib/config";

const DAY_LABELS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

// Sitewide footer. NAP comes from COMPANY_NAP only — never inline these
// values (CLAUDE.md rule 3; T23 audits them against the Google Business
// Profile verbatim).
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-semibold">{COMPANY_NAP.name}</p>
          <address className="mt-3 text-sm leading-6 text-muted-foreground not-italic">
            {COMPANY_NAP.address}
            <br />
            <a
              href={`tel:${COMPANY_NAP.phone.replace(/[^0-9+]/g, "")}`}
              className="hover:text-foreground hover:underline"
            >
              {COMPANY_NAP.phone}
            </a>
          </address>
        </div>
        <div>
          <p className="text-sm font-semibold">Hours</p>
          <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
            {DAY_LABELS.map(([key, label]) => (
              <div key={key} className="flex justify-between gap-6">
                <dt>{label}</dt>
                <dd>{COMPANY_NAP.hours[key]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex items-center justify-center">
          <div className="relative h-[90px] w-[161px]">
            <Image
              src="/Untitled_design_cropped.png"
              alt=""
              fill
              className="object-contain"
              sizes="161px"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {COMPANY_NAP.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
