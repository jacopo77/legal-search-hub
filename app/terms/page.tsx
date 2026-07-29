import type { Metadata } from "next";
import { COMPANY_NAP } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Legal Search Hub's attorney directory, free and Premium listings, and payment terms.",
};

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-navy">{heading}</h2>
      <p className="mt-3 leading-7 text-muted-foreground">{children}</p>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: July 29, 2026
      </p>

      <p className="mt-6 leading-7 text-muted-foreground">
        These Terms of Service (&quot;Terms&quot;) govern your use of the
        Legal Search Hub website and directory (the &quot;Service&quot;),
        operated by {COMPANY_NAP.name}{" "}
        (&quot;Legal Search Hub,&quot; &quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;). By accessing or
        using the Service — as a visitor searching for an attorney, or as a
        law firm creating or maintaining a listing — you agree to be bound by
        these Terms. If you do not agree, please do not use the Service.
      </p>

      <Section heading="Directory Listings">
        Legal Search Hub offers a free directory listing to any law firm or
        attorney licensed to practice in the State of Arizona. Free listings
        may include the firm&apos;s name, contact information, business
        hours, one practice area, and a short biography. All new listing
        submissions and edit requests are reviewed by our team before
        publication; we may decline, edit for accuracy, or remove any listing
        at our discretion, including listings that are inaccurate,
        misleading, abandoned, or that violate these Terms.
      </Section>

      <Section heading="Premium Listings and Payment">
        Firms may upgrade to a Premium listing for $29 per month, billed
        automatically on a recurring monthly basis through our payment
        processor, Stripe. Premium listings receive priority placement in our
        Featured Listings section, an expanded profile supporting multiple
        practice areas and a photo gallery, and a direct &quot;Contact This
        Firm&quot; inquiry form. You may cancel your Premium subscription at
        any time by contacting us using the information below; cancellation
        takes effect at the end of the then-current monthly billing period,
        and your listing will revert to a free listing at that time. You are
        responsible for keeping your payment information current, and a
        failed payment may result in your listing reverting to free status.
      </Section>

      <Section heading="Refund Policy">
        Premium subscription fees are billed in advance and are
        non-refundable, including for partial months, except where required
        by applicable law. If you believe you were charged in error, contact
        us using the information below and we will review the matter in good
        faith.
      </Section>

      <Section heading="Not a Law Firm; No Legal Advice">
        Legal Search Hub is a directory and marketing platform. We are not a
        law firm, we do not employ attorneys, and nothing on the Service
        constitutes legal advice, a legal opinion, or a referral or
        recommendation of any specific attorney or firm. Your use of the
        Service to identify or contact a law firm does not create an
        attorney-client relationship with Legal Search Hub. Any
        attorney-client relationship you form is solely between you and the
        firm you choose to engage.
      </Section>

      <Section heading="User Conduct">
        When using the Service, you agree not to: (a) submit false,
        misleading, or fraudulent information in a listing, claim request, or
        inquiry; (b) impersonate a firm or attorney you are not authorized to
        represent; (c) use the Service to harvest contact information for
        unsolicited commercial messages; (d) attempt to interfere with,
        disrupt, or gain unauthorized access to the Service or its underlying
        systems; or (e) use the Service for any unlawful purpose.
      </Section>

      <Section heading="Claiming, Editing, and Removing Listings">
        A firm, or an authorized representative of a firm, may request to
        claim an unclaimed listing or suggest an edit to an existing listing
        through the process provided on each listing page. Claim and edit
        requests are reviewed manually by our team; we do not automatically
        verify bar membership, employment, or authority to act on a
        firm&apos;s behalf, and we may request additional information before
        approving a request. A firm may request that its listing be removed
        at any time by contacting us using the information below.
      </Section>

      <Section heading="Disclaimer of Warranties; Limitation of Liability">
        The Service and all listing information are provided &quot;as
        is&quot; and &quot;as available,&quot; without warranties of any
        kind, express or implied. We do not guarantee the accuracy,
        completeness, or current status of any listing, including ratings
        sourced from third parties such as Google. To the fullest extent
        permitted by law, Legal Search Hub and its officers, employees, and
        agents will not be liable for any indirect, incidental, or
        consequential damages arising from your use of the Service or your
        engagement of any listed firm.
      </Section>

      <Section heading="Governing Law">
        These Terms are governed by the laws of the State of Arizona, without
        regard to its conflict-of-law principles. Any dispute arising under
        these Terms will be subject to the exclusive jurisdiction of the
        state and federal courts located in Maricopa County, Arizona.
      </Section>

      <Section heading="Changes to These Terms">
        We may update these Terms from time to time. Material changes will be
        reflected by an updated effective date on this page. Your continued
        use of the Service after changes take effect constitutes acceptance
        of the revised Terms.
      </Section>

      <address className="mt-8 border-t border-border pt-6 leading-7 text-foreground not-italic">
        Questions about these Terms? Contact us at:
        <br />
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
