import { L10Detail } from "@/components/l10/l10-detail"

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <L10Detail id={id} />
}
