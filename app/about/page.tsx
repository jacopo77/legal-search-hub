import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Legal Search Hub, a directory connecting people with local law firms.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        About Legal Search Hub
      </h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Legal Search Hub helps people find the right local law firm by
        practice area, backed by cached Google ratings so you can compare
        options at a glance. We&apos;re building city by city, starting in
        Phoenix, Arizona.
      </p>
    </div>
  );
}
