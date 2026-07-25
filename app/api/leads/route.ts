import { createAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/schemas/lead";
import { createOrUpdateContact } from "@/lib/highlevel";

// POST /api/leads — "Contact this firm" lead intake (T21, premium firms
// only).
//
// Flow: validate → confirm the firm exists, is live, and is premium →
// insert the leads row → fire the HighLevel lead trigger (upsert the
// lead as a contact tagged for the firm — HighLevel workflows are the
// delivery path to the firm, not a direct email from this app, per
// ARCHITECTURE.md §5). HighLevel is best-effort (rule 7): on success the
// row's synced_to_highlevel flips true; on failure it stays false and the
// failure is only logged — the local row is the source of truth.
//
// Uses the admin client deliberately: after insert this handler updates
// the row's sync flag, which RLS grants only to admins — the public
// insert policy alone can't cover the sync-status write.
export async function POST(request: Request) {
  const parsed = leadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const supabase = createAdminClient();

  // Leads are a premium-only feature — confirm the target firm is a live
  // premium listing, never trust the client-supplied id.
  const { data: firm } = await supabase
    .from("firms")
    .select("id, name")
    .eq("id", input.firmId)
    .eq("status", "live")
    .eq("tier", "premium")
    .maybeSingle();
  if (!firm) {
    return Response.json({ error: "Unknown firm" }, { status: 404 });
  }

  const email = input.email.toLowerCase();
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      firm_id: firm.id,
      name: input.name,
      email,
      phone: input.phone || null,
      message: input.message,
    })
    .select("id")
    .single();
  if (error) {
    console.error("leads: insert failed", error);
    return Response.json(
      { error: "Could not send your message — please try again" },
      { status: 500 },
    );
  }

  // HighLevel lead trigger — best-effort (rule 7). The firm's HighLevel
  // workflow picks the contact up by tag and notifies the firm.
  const contact = await createOrUpdateContact({
    name: input.name,
    email,
    phone: input.phone,
    tags: ["legal-search-hub", "firm-lead", `firm:${firm.id}`],
  });
  if (!contact.ok) {
    console.error("leads: HighLevel sync failed", contact.error);
  } else {
    const { error: syncError } = await supabase
      .from("leads")
      .update({ synced_to_highlevel: true })
      .eq("id", lead.id);
    if (syncError) {
      console.error("leads: sync-flag update failed", syncError);
    }
  }

  return Response.json({ ok: true }, { status: 201 });
}
