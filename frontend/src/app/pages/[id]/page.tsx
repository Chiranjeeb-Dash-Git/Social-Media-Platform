import { PageDetailClient } from "@/components/PageDetailClient";

export const dynamic = "force-dynamic";

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageDetailClient pageId={id} />;
}
