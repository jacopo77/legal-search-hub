import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";

// POST /api/admin/firms/[id] — admin mutations on a single firm (T16 +
// docs/DESIGN-BADGES.md). Uses the caller's own cookie session (not the
// service-role admin client): `is_admin()` already grants the bypass on
// the firms guard trigger and RLS admin policy, so every mutation here is
// attributed to the acting admin.
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

  if (intent === "approve" || intent === "reject") {
    const { error } = await supabase
      .from("firms")
      .update({ status: STATUS_BY_INTENT[intent] })
      .eq("id", id)
      .eq("status", "pending");
    if (error) {
      console.error("admin/firms: status update failed", error);
      return Response.json(
        { error: "Could not update firm" },
        { status: 500 },
      );
    }
    redirect("/admin");
  }

  if (intent === "toggle-listing") {
    const { data: firm } = await supabase
      .from("firms")
      .select("status")
      .eq("id", id)
      .in("status", ["live", "suspended"])
      .maybeSingle();
    if (!firm) {
      return Response.json(
        { error: "Firm not found or not live/suspended" },
        { status: 404 },
      );
    }
    const nextStatus = firm.status === "live" ? "suspended" : "live";
    const { error } = await supabase
      .from("firms")
      .update({ status: nextStatus })
      .eq("id", id);
    if (error) {
      console.error("admin/firms: listing toggle failed", error);
      return Response.json(
        { error: "Could not update listing" },
        { status: 500 },
      );
    }
    redirect("/admin");
  }

  if (intent === "toggle-premium-badge") {
    const { data: firm } = await supabase
      .from("firms")
      .select("premium_badge")
      .eq("id", id)
      .maybeSingle();
    if (!firm) {
      return Response.json({ error: "Firm not found" }, { status: 404 });
    }
    const { error } = await supabase
      .from("firms")
      .update({ premium_badge: !firm.premium_badge })
      .eq("id", id);
    if (error) {
      console.error("admin/firms: toggle-premium-badge failed", error);
      return Response.json(
        { error: "Could not update badge" },
        { status: 500 },
      );
    }
    redirect("/admin");
  }

  return Response.json({ error: "Invalid intent" }, { status: 400 });
}
