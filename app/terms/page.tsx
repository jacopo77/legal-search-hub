import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        Terms of Service
      </h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        This page is a placeholder. Our full terms of service — covering use
        of the directory and listing/premium subscription terms — are being
        finalized and will be published here before launch.
      </p>
    </div>
  );
}
