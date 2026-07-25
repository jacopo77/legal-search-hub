import { ModerationQueue } from "@/components/admin/moderation-queue";

// Admin moderation queue — /admin. Thin wrapper; role gate and data
// fetching live in ModerationQueue (T16).
export default async function AdminPage() {
  return <ModerationQueue />;
}
