import { listInbox } from "@/lib/notifications-server"
import { InboxView } from "@/components/inbox/inbox-view"

export const metadata = { title: "Inbox · Orage Core" }
export const dynamic = "force-dynamic"

export default async function InboxPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const items = await listInbox(workspace, { limit: 100 })
  return <InboxView items={items} workspaceSlug={workspace} />
}
