import { createAdminClient } from "@/lib/supabase/admin";
import { listingSignupSchema } from "@/lib/schemas/listing-signup";
import { createOrUpdateContact, triggerSignupWebhook } from "@/lib/highlevel";

// POST /api/listings — "List Your Firm" free signup (T14).
//
// Flow: validate → create-or-find the owner's auth user (magic-link only;
// brand-new owners get a sign-in email) → insert firms row as
// pending/free → link the single free-tier practice area → fire the
// HighLevel new-signup trigger (best-effort per CLAUDE.md rule 7: a
// HighLevel failure is logged, never returned as an error — the local row
// is the source of truth).
//
// Uses the admin client deliberately: the submitter has no session yet
// (their first magic link arrives because of this request), so RLS's
// owner policies can't apply. The guard trigger's coercion targets are
// written explicitly below (pending/free/owner), matching what the
// trigger would enforce for a self-serve insert.

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(request: Request) {
  const parsed = listingSignupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const supabase = createAdminClient();

  // Verify the referenced rows server-side — never trust client-supplied
  // IDs. City must be live (self-serve signup only in live cities).
  const [{ data: city }, { data: practiceArea }] = await Promise.all([
    supabase
      .from("cities")
      .select("id, name")
      .eq("id", input.cityId)
      .eq("status", "live")
      .maybeSingle(),
    supabase
      .from("practice_areas")
      .select("id, name")
      .eq("id", input.practiceAreaId)
      .maybeSingle(),
  ]);
  if (!city || !practiceArea) {
    return Response.json(
      { error: "Unknown city or practice area" },
      { status: 400 },
    );
  }

  // Create-or-find the owner's auth user.
  const email = input.ownerEmail.toLowerCase();
  let userId: string;
  let isNewOwner = false;
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // magic-link only; no password to confirm
      user_metadata: { full_name: input.ownerName },
    });
  if (created.user) {
    userId = created.user.id;
    isNewOwner = true;
  } else if (createError?.message.toLowerCase().includes("already")) {
    // Page through all auth users — listUsers returns one page at a time,
    // and a first-page-only lookup permanently blocks any email whose
    // account sits past the first 1000 users.
    let existing;
    let page = 1;
    for (;;) {
      const { data: list, error: listError } =
        await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (listError) {
        console.error("listings: user lookup failed", listError);
        return Response.json(
          { error: "Could not create your account — please try again" },
          { status: 500 },
        );
      }
      existing = list.users.find((u) => u.email?.toLowerCase() === email);
      if (existing || list.users.length < 1000) break;
      page++;
    }
    if (!existing) {
      console.error("listings: user lookup failed — account not found");
      return Response.json(
        { error: "Could not create your account — please try again" },
        { status: 500 },
      );
    }
    userId = existing.id;
  } else {
    console.error("listings: createUser failed", createError);
    return Response.json(
      { error: "Could not create your account — please try again" },
      { status: 500 },
    );
  }

  // Expand the simplified hours inputs to the 7-day jsonb shape.
  const hours: Record<string, string> = {};
  if (input.hoursWeekday) {
    for (const day of ["mon", "tue", "wed", "thu", "fri"]) {
      hours[day] = input.hoursWeekday;
    }
  }
  if (input.hoursSaturday) hours.sat = input.hoursSaturday;
  if (input.hoursSunday) hours.sun = input.hoursSunday;

  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .insert({
      city_id: city.id,
      owner_id: userId,
      status: "pending", // admin approval before going live (PRD §5.5)
      tier: "free",
      name: input.firmName,
      slug: slugify(input.firmName),
      phone: input.phone,
      address: input.address,
      website: input.website || null,
      hours: Object.keys(hours).length ? hours : null,
      bio_short: input.bioShort,
    })
    .select("id")
    .single();

  if (firmError) {
    // Unique-slug collision: either a retry of this same submission or a
    // same-named firm. Either way, don't create a duplicate.
    if (firmError.code === "23505") {
      return Response.json(
        {
          error:
            "A listing with this firm name already exists or was already submitted",
        },
        { status: 409 },
      );
    }
    console.error("listings: firm insert failed", firmError);
    return Response.json(
      { error: "Could not save your listing — please try again" },
      { status: 500 },
    );
  }

  // Free tier = exactly one practice area (application-level rule).
  const { error: linkError } = await supabase
    .from("firm_practice_areas")
    .insert({ firm_id: firm.id, practice_area_id: practiceArea.id });
  if (linkError) {
    console.error("listings: practice-area link failed", linkError);
    return Response.json(
      { error: "Could not save your listing — please try again" },
      { status: 500 },
    );
  }

  // Magic link for brand-new owners so they can sign in later. Failure here
  // doesn't block the signup — the form's copy reflects whether it actually
  // sent, and /sign-in is the recovery path. Lands on /auth/callback, which
  // exchanges the code for a session.
  let magicLinkSent = false;
  if (isNewOwner) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });
    if (otpError) {
      console.error("listings: magic link failed", otpError);
    } else {
      magicLinkSent = true;
    }
  }

  // HighLevel new-signup trigger — best-effort (rule 7).
  const highlevel = await createOrUpdateContact({
    name: input.ownerName,
    email,
    phone: input.phone,
    tags: ["legal-search-hub", "new-signup"],
  });
  if (!highlevel.ok) {
    console.error("listings: HighLevel sync failed", highlevel.error);
  }

  // "List Your Firm" webhook trigger (separate HighLevel workflow from the
  // contact upsert above) — same best-effort rule: never blocks the
  // response the submitter sees.
  const webhook = await triggerSignupWebhook({
    firm_name: input.firmName,
    email,
    phone: input.phone,
    address: input.address,
    city: city.name,
    practice_area: practiceArea.name,
    website: input.website || "",
    your_name: input.ownerName,
  });
  if (!webhook.ok) {
    console.error("listings: HighLevel signup webhook failed", webhook.error);
  }

  // Note: no isNewOwner in the response — it would enumerate which emails
  // have accounts. magicLinkSent keeps the UI copy honest instead.
  return Response.json({ ok: true, magicLinkSent }, { status: 201 });
}
