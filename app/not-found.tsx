import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// Global 404 — renders inside RootLayout (SiteNav/SiteFooter included
// automatically), so every notFound() call across the app gets a branded
// page instead of Next's bare default. Links to "/" rather than a
// hardcoded city slug: "/" already resolves through HOMEPAGE_MODE to
// whichever city or national view is currently live (CLAUDE.md rule 2).
export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 text-muted-foreground">
        It may have moved, been claimed, or never existed. Try searching the
        directory instead.
      </p>

      <form
        action="/"
        role="search"
        className="mt-8 flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:ring-3 focus-within:ring-ring/50"
      >
        <Search
          className="ml-2 size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="not-found-search" className="sr-only">
          Search attorneys
        </label>
        <input
          id="not-found-search"
          name="q"
          type="search"
          placeholder="Search attorneys by name, practice area, or keyword"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red/85"
        >
          Search
        </button>
      </form>

      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        Back to the directory
      </Link>
    </div>
  );
}
