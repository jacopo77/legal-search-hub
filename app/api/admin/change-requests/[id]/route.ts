import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";

// POST /api/admin/change-requests/[id] — mark a claim/edit request resolved
// (T16). Resolution itself (applying the requested edit or granting the
// claim) is a manual admin action outside this app per CLAUDE.md's T17
// note — this just closes the queue entry.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { isAdmin, supabase } = await requireAdmin();
  if (!isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();
  if (formData.get("intent") !== "resolve") {
    return Response.json({ error: "Invalid intent" }, { status: 400 });
  }

  const { error } = await supabase
    .from("firm_change_requests")
    .update({ status: "resolved" })
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    console.error("admin/change-requests: status update failed", error);
    return Response.json(
      { error: "Could not update request" },
      { status: 500 },
    );
  }

  redirect("/admin");
}
