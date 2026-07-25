import { createAdminClient } from "@/lib/supabase/admin";
import { changeRequestSchema } from "@/lib/schemas/change-request";
import { createOrUpdateContact, createTask } from "@/lib/highlevel";

// POST /api/listings/[id]/claim — claim/edit-request intake (T17).
//
// Flow: validate → confirm the firm exists and is live → insert the
// firm_change_requests row (status pending) → fire the HighLevel
// claim/edit trigger (upsert the requester as a contact, then createTask
// on it). HighLevel is best-effort per CLAUDE.md rule 7: on success the
// row's status becomes 'highlevel_synced', on failure it stays 'pending'
// and the failure is only logged — the local row is the source of truth
// and the T16 admin queue shows both statuses as open.
//
// No automated ownership verification and no auto-apply — an admin
// resolves every request manually (docs/ARCHITECTURE.md §4.7).
//
// Uses the admin client deliberately: after insert this handler updates
// the row's sync status, which RLS grants only to admins — the public
// insert policy alone can't cover the sync-status write.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = changeRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const supabase = createAdminClient();

  // Confirm the target firm exists and is publicly listed — never trust a
  // client-supplied id.
  const { data: firm } = await supabase
    .from("firms")
    .select("id, name")
    .eq("id", id)
    .eq("status", "live")
    .maybeSingle();
  if (!firm) {
    return Response.json({ error: "Unknown firm" }, { status: 404 });
  }

  const email = input.requesterEmail.toLowerCase();
  const { data: changeRequest, error } = await supabase
    .from("firm_change_requests")
    .insert({
      firm_id: firm.id,
      type: input.type,
      requester_name: input.requesterName,
      requester_email: email,
      requester_phone: input.requesterPhone || null,
      message: input.message,
    })
    .select("id")
    .single();
  if (error) {
    console.error("claim: change-request insert failed", error);
    return Response.json(
      { error: "Could not save your request — please try again" },
      { status: 500 },
    );
  }

  // HighLevel claim/edit trigger — best-effort (rule 7). v1 stores no
  // HighLevel contact id on firms, so the task hangs on the requester's
  // contact (ARCHITECTURE.md §5: "or a new contact, if unclaimed").
  const contact = await createOrUpdateContact({
    name: input.requesterName,
    email,
    phone: input.requesterPhone,
    tags: ["legal-search-hub", `${input.type}-request`],
  });
  if (!contact.ok) {
    console.error("claim: HighLevel contact sync failed", contact.error);
  } else {
    const task = await createTask({
      contactId: contact.data.id,
      title: `${input.type === "claim" ? "Claim" : "Edit"} request: ${firm.name}`,
      body: `From: ${input.requesterName} <${email}>\n\n${input.message}`,
    });
    if (!task.ok) {
      console.error("claim: HighLevel task creation failed", task.error);
    } else {
      const { error: syncError } = await supabase
        .from("firm_change_requests")
        .update({ status: "highlevel_synced" })
        .eq("id", changeRequest.id);
      if (syncError) {
        console.error("claim: sync-status update failed", syncError);
      }
    }
  }

  return Response.json({ ok: true }, { status: 201 });
}
