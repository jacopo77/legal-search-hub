import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY_NAP } from "@/lib/config";

export const metadata: Metadata = {
  title: "Legal Disclaimer",
  description:
    "Legal Search Hub is a directory service only — we do not provide legal advice, referrals, or endorsements.",
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

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        Legal Disclaimer
      </h1>

      <p className="mt-6 leading-7 text-muted-foreground">
        Legal Search Hub is a directory service. We help people find law
        firms in Arizona by practice area and location; we do not practice
        law, and nothing on this website should be understood otherwise.
      </p>

      <Section heading="Directory Service Only">
        {COMPANY_NAP.name} operates an online directory of law firms and
        attorneys serving Phoenix, Arizona and, as we expand, other Arizona
        cities. We are a marketing and information platform, not a law firm,
        a lawyer referral service, or a substitute for individualized legal
        counsel.
      </Section>

      <Section heading="No Legal Advice or Referral">
        Nothing on this website — including practice-area descriptions, firm
        biographies, or any other content we publish — constitutes legal
        advice or a legal opinion, and Legal Search Hub does not recommend,
        endorse, or refer you to any specific attorney or firm for your
        particular matter. Every legal situation is different, and you
        should consult directly with a licensed attorney about your specific
        facts and circumstances.
      </Section>

      <Section heading="No Endorsement">
        The inclusion of a law firm or attorney in our directory — whether as
        a free or Premium listing — is not an endorsement, certification, or
        guarantee of that firm&apos;s quality, competence, or fitness for any
        particular matter. Premium listings pay a fee for additional
        visibility on the Service; this arrangement affects placement only
        and does not reflect our assessment of the firm&apos;s legal
        ability.
      </Section>

      <Section heading="Verify Attorney Credentials">
        Before engaging any attorney, we encourage you to independently
        verify their license status and standing with the State Bar of
        Arizona at{" "}
        <a
          href="https://www.azbar.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          azbar.org
        </a>
        . Bar numbers and licensing information shown on this Service, where
        provided, are self-reported by the listed firm and have not been
        independently verified by Legal Search Hub.
      </Section>

      <Section heading="Attorney-Client Relationship">
        Contacting a firm through this Service, submitting an inquiry, or
        otherwise using the Service does not create an attorney-client
        relationship between you and Legal Search Hub. Any attorney-client
        relationship — and any duties of confidentiality or privilege that
        come with it — exists solely between you and the firm you choose to
        engage, and typically begins only once that firm has agreed to
        represent you.
      </Section>

      <Section heading="Accuracy of Information">
        We ask listed firms to keep their information current, and we review
        submissions before publication, but we cannot guarantee that every
        listing is complete, accurate, or up to date at any given moment,
        including cached Google ratings and review counts, which are
        refreshed periodically rather than in real time. Contact a firm
        directly to confirm current details before relying on them.
      </Section>

      <p className="mt-8 leading-7 text-muted-foreground">
        For questions about this disclaimer, see our{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        or{" "}
        <Link href="/contact" className="text-primary hover:underline">
          contact us
        </Link>
        .
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
