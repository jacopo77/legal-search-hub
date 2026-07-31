import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/list-your-firm/signup-form";

// "List Your Firm" — free signup flow (T14). Server page fetches the
// select options; the form itself is a leaf client component.
export const metadata: Metadata = {
  title: "List Your Firm",
  description:
    "Add your law firm to the Legal Search Hub directory. Free listings include your contact info, hours, and one practice area.",
};

export default async function ListYourFirmPage() {
  const supabase = await createClient();
  const [{ data: cities }, { data: practiceAreas }] = await Promise.all([
    supabase
      .from("cities")
      .select("id, name")
      .eq("status", "live")
      .order("sort_order"),
    supabase.from("practice_areas").select("id, name").order("sort_order"),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">List your firm</h1>
      <p className="mt-2 text-muted-foreground">
        Free listings put your firm in front of people actively searching for
        an attorney. Every submission is reviewed before it goes live.
      </p>
      <div id="signup-form" className="mt-12 scroll-mt-8">
        <h2 className="text-xl font-semibold">Submit your listing</h2>
        <div className="mt-4">
          <SignupForm
            cities={cities ?? []}
            practiceAreas={practiceAreas ?? []}
          />
        </div>
      </div>
    </div>
  );
}
