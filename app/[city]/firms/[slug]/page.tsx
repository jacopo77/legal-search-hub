import { FirmDetail } from "@/components/firms/firm-detail";

// Firm detail page — /[city]/firms/[slug]. Thin wrapper; all logic lives in
// the shared FirmDetail component. `checkout` is the status Stripe sent the
// owner back with after an upgrade attempt (T18).
export default async function FirmDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ city, slug }, { checkout }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <FirmDetail citySlug={city} firmSlug={slug} checkoutStatus={checkout} />
  );
}
