import type { Metadata } from "next";
import { COMPANY_NAP } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Legal Search Hub.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        Contact Us
      </h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Questions about a listing, a claim request, or the directory in
        general? Reach us at the details below.
      </p>
      <address className="mt-6 leading-7 text-foreground not-italic">
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
