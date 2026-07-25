import { FirmDetail } from "@/components/firms/firm-detail";

// Firm detail page — /[city]/firms/[slug]. Thin wrapper; all logic lives in
// the shared FirmDetail component.
export default async function FirmDetailPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  return <FirmDetail citySlug={city} firmSlug={slug} />;
}
