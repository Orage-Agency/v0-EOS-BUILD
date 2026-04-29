import { L10List } from "@/components/l10/l10-list"
import { listL10Meetings } from "@/lib/l10-server"

export default async function L10Page({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const initialMeetings = await listL10Meetings(workspace)
  return <L10List initialMeetings={initialMeetings} workspaceSlug={workspace} />
}
