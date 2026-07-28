import Link from "next/link";
import Image from "next/image";
import { COMPANY_NAP } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

async function getPracticeAreas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_areas")
    .select("slug, name")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("SiteFooter: practice_areas query failed", error);
    return [];
  }
  return data ?? [];
}

// Sitewide footer. NAP comes from COMPANY_NAP only — never inline these
// values (CLAUDE.md rule 3; T23 audits them against the Google Business
// Profile verbatim). Practice-area links point at "/" rather than a
// hardcoded city slug — "/" already resolves through HOMEPAGE_MODE to
// whichever city or national view is currently live (CLAUDE.md rule 2),
// same pattern app/not-found.tsx uses.
export async function SiteFooter() {
  const practiceAreas = await getPracticeAreas();

  return (
    <footer className="border-t border-white/10 bg-[#1E3A5F]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 text-white sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-semibold text-white">{COMPANY_NAP.name}</p>
          <address className="mt-3 text-sm leading-6 not-italic text-white/80">
            {COMPANY_NAP.address}
            <br />
            <a
              href={`tel:${COMPANY_NAP.phone.replace(/[^0-9+]/g, "")}`}
              className="text-white hover:text-white/80 hover:underline"
            >
              {COMPANY_NAP.phone}
            </a>
          </address>
        </div>

        {practiceAreas.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-white">Practice Areas</p>
            <ul className="mt-3 space-y-1.5 text-sm text-white/80">
              {practiceAreas.map((area) => (
                <li key={area.slug}>
                  <Link
                    href={`/?practiceArea=${area.slug}`}
                    className="hover:text-white hover:underline"
                  >
                    {area.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-white">Company</p>
          <ul className="mt-3 space-y-1.5 text-sm text-white/80">
            <li>
              <Link href="/about" className="hover:text-white hover:underline">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white hover:underline">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center lg:justify-end">
          <div className="relative h-[120px] w-[214px]">
            <Image
              src="/Untitled_design_cropped.png"
              alt=""
              fill
              className="object-contain"
              sizes="214px"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/60">
          © {new Date().getFullYear()} {COMPANY_NAP.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
