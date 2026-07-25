import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { Button } from "@/components/ui/button";

// T16: admin moderation queue. Functional table + action buttons only — no
// polish required per docs/TASKS.md. Role-gated: any non-admin (including
// signed-out visitors) gets a 404, matching FirmDetail's not-found pattern
// rather than leaking a 403 that reveals the route exists.
// Untyped until `supabase gen types` (see lib/supabase/server.ts TODO).
type PendingFirmRow = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  created_at: string;
  cities: { name: string } | null;
};

type ChangeRequestRow = {
  id: string;
  type: "claim" | "edit";
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  message: string;
  created_at: string;
  firms: { name: string; slug: string } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function ModerationQueue() {
  const { user, isAdmin, supabase } = await requireAdmin();
  if (!user || !isAdmin) notFound();

  const [
    { data: pendingFirms, error: firmsError },
    { data: changeRequests, error: changeRequestsError },
  ] = await Promise.all([
    supabase
      .from("firms")
      .select("id, name, slug, phone, created_at, cities(name)")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("firm_change_requests")
      .select(
        "id, type, requester_name, requester_email, requester_phone, message, created_at, firms(name, slug)",
      )
      .eq("status", "pending")
      .order("created_at"),
  ]);

  if (firmsError)
    console.error("ModerationQueue: pending firms query failed", firmsError);
  if (changeRequestsError)
    console.error(
      "ModerationQueue: change requests query failed",
      changeRequestsError,
    );

  const firms = (pendingFirms ?? []) as unknown as PendingFirmRow[];
  const requests = (changeRequests ?? []) as unknown as ChangeRequestRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Moderation queue</h1>

      <section aria-labelledby="pending-firms-heading">
        <h2 id="pending-firms-heading" className="text-lg font-semibold">
          Pending firms ({firms.length})
        </h2>
        {firms.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">Nothing pending.</p>
        ) : (
          <div className="border-border mt-3 overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Firm</th>
                  <th className="px-4 py-2 font-medium">City</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Submitted</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {firms.map((firm) => (
                  <tr key={firm.id} className="border-border border-t">
                    <td className="px-4 py-2 font-medium">{firm.name}</td>
                    <td className="text-muted-foreground px-4 py-2">
                      {firm.cities?.name ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      {firm.phone ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      {formatDate(firm.created_at)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <form
                          action={`/api/admin/firms/${firm.id}`}
                          method="POST"
                        >
                          <input type="hidden" name="intent" value="approve" />
                          <Button type="submit" size="sm">
                            Approve
                          </Button>
                        </form>
                        <form
                          action={`/api/admin/firms/${firm.id}`}
                          method="POST"
                        >
                          <input type="hidden" name="intent" value="reject" />
                          <Button type="submit" size="sm" variant="destructive">
                            Reject
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="change-requests-heading">
        <h2 id="change-requests-heading" className="text-lg font-semibold">
          Open claim / edit requests ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">Nothing open.</p>
        ) : (
          <div className="border-border mt-3 overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Firm</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Requester</th>
                  <th className="px-4 py-2 font-medium">Message</th>
                  <th className="px-4 py-2 font-medium">Submitted</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-border border-t align-top">
                    <td className="px-4 py-2 font-medium">
                      {req.firms?.name ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-2 capitalize">
                      {req.type}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      <div>{req.requester_name}</div>
                      <div className="text-xs">{req.requester_email}</div>
                      {req.requester_phone && (
                        <div className="text-xs">{req.requester_phone}</div>
                      )}
                    </td>
                    <td className="text-muted-foreground max-w-xs px-4 py-2">
                      {req.message}
                    </td>
                    <td className="text-muted-foreground px-4 py-2">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-4 py-2">
                      <form
                        action={`/api/admin/change-requests/${req.id}`}
                        method="POST"
                      >
                        <input type="hidden" name="intent" value="resolve" />
                        <Button type="submit" size="sm">
                          Mark resolved
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
