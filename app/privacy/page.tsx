import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        Privacy Policy
      </h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        This page is a placeholder. Our full privacy policy — covering what
        information we collect from visitors and listed firms and how it is
        used — is being finalized and will be published here before launch.
      </p>
    </div>
  );
}
