import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";

// POST /api/admin/firms/[id] — approve or reject a pending firm (T16).
// Uses the caller's own cookie session (not the service-role admin client):
// `is_admin()` already grants the bypass on the firms guard trigger and RLS
// admin policy, so the mutation is attributed to the acting admin.
const STATUS_BY_INTENT = { approve: "live", reject: "rejected" } as const;

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
  const intent = formData.get("intent");
  const status =
    typeof intent === "string" && intent in STATUS_BY_INTENT
      ? STATUS_BY_INTENT[intent as keyof typeof STATUS_BY_INTENT]
      : undefined;
  if (!status) {
    return Response.json({ error: "Invalid intent" }, { status: 400 });
  }

  const { error } = await supabase
    .from("firms")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    console.error("admin/firms: status update failed", error);
    return Response.json({ error: "Could not update firm" }, { status: 500 });
  }

  redirect("/admin");
}
