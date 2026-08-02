import { createClient } from "@/lib/supabase/server";
import { savedFirmSchema } from "@/lib/schemas/saved-firm";

// /api/saved-firms — signed-in save/unsave toggle backing lib/saved-firms.ts.
// No admin client needed anywhere here: saved_firms' RLS policies already
// scope every row to user_id = auth.uid(), so the session-scoped client is
// sufficient for the select/insert/delete themselves (CLAUDE.md's "mutations
// go through app/api/**/route.ts" without needing to bypass RLS).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_firms")
    .select("firm_id")
    .eq("user_id", user.id);
  if (error) {
    console.error("saved-firms: list failed", error);
    return Response.json(
      { error: "Could not load saved firms" },
      { status: 500 },
    );
  }

  return Response.json({
    firmIds: (data ?? []).map((row) => row.firm_id as string),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in to save firms" }, { status: 401 });
  }

  const parsed = savedFirmSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  // ignoreDuplicates: saving an already-saved firm (e.g. a double-click, or
  // two tabs racing) is a no-op, not an error -- the PK is (user_id, firm_id).
  const { error } = await supabase.from("saved_firms").upsert(
    { user_id: user.id, firm_id: parsed.data.firmId },
    { onConflict: "user_id,firm_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("saved-firms: save failed", error);
    return Response.json(
      { error: "Could not save — please try again" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to manage saved firms" },
      { status: 401 },
    );
  }

  const parsed = savedFirmSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("saved_firms")
    .delete()
    .eq("user_id", user.id)
    .eq("firm_id", parsed.data.firmId);
  if (error) {
    console.error("saved-firms: delete failed", error);
    return Response.json(
      { error: "Could not remove — please try again" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
