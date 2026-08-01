import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

// POST /api/billing/checkout — premium upgrade (T18). The upgrade button on
// an owner's own firm page is a plain form POST here; we verify ownership,
// create a Stripe Checkout Session, and 303-redirect the browser to Stripe.
//
// Only the session is read via the cookie client; data checks go through
// the admin client so the route doesn't depend on owner RLS policies for
// firms/profiles reads. The actual tier flip happens in the Stripe webhook
// (T19) — this route changes nothing locally.
// Untyped until `supabase gen types` (see lib/supabase/server.ts TODO).
type CheckoutFirmRow = {
  id: string;
  name: string;
  slug: string;
  tier: "free" | "premium";
  status: string;
  owner_id: string | null;
  cities: { slug: string; status: string } | null;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const firmId = formData.get("firmId")?.toString();
  const plan = formData.get("plan")?.toString();
  const origin = new URL(request.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", origin), 303);
  }
  if (!firmId) {
    return Response.json({ error: "Missing firmId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("firms")
    .select("id, name, slug, tier, status, owner_id, cities(slug, status)")
    .eq("id", firmId)
    .maybeSingle();
  const firm = data as unknown as CheckoutFirmRow | null;

  // Only the owner can upgrade their own live, free-tier listing, in a live
  // city. Anything else (not theirs, already premium, not yet approved,
  // city taken back to coming_soon) just bounces back to the firm page
  // without creating a session.
  const firmPath = firm?.cities
    ? `/${firm.cities.slug}/firms/${firm.slug}`
    : "/";
  if (
    !firm ||
    firm.owner_id !== user.id ||
    firm.tier !== "free" ||
    firm.status !== "live" ||
    firm.cities?.status !== "live"
  ) {
    return NextResponse.redirect(new URL(firmPath, origin), 303);
  }

  const priceId =
    plan === "annual"
      ? env.stripe.premiumAnnualPriceId()
      : env.stripe.premiumPriceId();

  // Reuse the owner's Stripe customer if a previous checkout created one
  // (ARCHITECTURE.md §6: billing identity lives on profiles, not firms).
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // The webhook (T19) resolves the firm from this — don't rely on
      // metadata alone.
      client_reference_id: firm.id,
      metadata: { firm_id: firm.id },
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id as string }
        : { customer_email: user.email }),
      success_url: `${origin}${firmPath}/edit?checkout=success`,
      cancel_url: `${origin}${firmPath}`,
    });
    if (!session.url) throw new Error("Stripe session missing url");
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("billing/checkout: session creation failed", err);
    return NextResponse.redirect(
      new URL(`${firmPath}?checkout=error`, origin),
      303,
    );
  }
}
