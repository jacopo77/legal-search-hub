import type { Metadata } from "next";
import { COMPANY_NAP } from "@/lib/config";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Legal Search Hub, a directory connecting Phoenix, Arizona residents with trusted local attorneys.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        About Legal Search Hub
      </h1>

      <p className="mt-4 leading-7 text-muted-foreground">
        Legal Search Hub was founded to make it easier for people in Phoenix,
        Arizona to find an attorney they can trust. Choosing the right lawyer
        is one of the most consequential decisions a person can make —
        whether you&apos;re facing a family law matter, a criminal charge, an
        injury claim, or a business dispute — and we built this directory to
        cut through the noise: a clear, searchable list of local firms
        organized by practice area, with independent Google ratings shown
        alongside every listing so you can compare your options at a glance.
      </p>

      <p className="mt-4 leading-7 text-muted-foreground">
        Any licensed Arizona attorney or law firm can list on Legal Search
        Hub. Free listings include the firm&apos;s name, contact information,
        one practice area, and a short biography, and every submission is
        reviewed by our team before it goes live. Firms that want additional
        visibility can upgrade to a Premium listing, which adds priority
        placement in our Featured Listings section, an expanded profile with
        multiple practice areas and a photo gallery, and a direct contact
        form so prospective clients can reach out.
      </p>

      <p className="mt-4 leading-7 text-muted-foreground">
        We don&apos;t operate our own review system. Instead, every listing
        displays its firm&apos;s publicly available Google rating and review
        count, so you&apos;re seeing an independent, third-party signal
        rather than anything we or the firm control.
      </p>

      <p className="mt-4 leading-7 text-muted-foreground">
        Legal Search Hub currently serves Phoenix, Arizona, and we&apos;re
        expanding city by city — Tucson and Flagstaff are next, with
        additional Arizona cities to follow. Legal Search Hub is a directory
        and marketing platform; we are not a law firm, and we do not provide
        legal advice or refer or recommend any specific attorney. Every
        attorney-client relationship is formed directly between you and the
        firm you choose to contact.
      </p>

      <address className="mt-8 border-t border-border pt-6 leading-7 text-foreground not-italic">
        {COMPANY_NAP.name}
        <br />
        {COMPANY_NAP.address}
        <br />
        <a
          href={`tel:${COMPANY_NAP.phone.replace(/[^0-9+]/g, "")}`}
          className="text-primary hover:underline"
        >
          {COMPANY_NAP.phone}
        </a>
      </address>
    </div>
  );
}
