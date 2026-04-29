import { IssuesShell } from "@/components/issues/issues-shell"
import { listIssuesForWorkspace } from "@/lib/issues-server"

export const metadata = {
  title: "Issues · Orage Core",
  description: "IDS queue · drag to reorder · resolve into Rock, Task, Decision, or Archive.",
}

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const initialIssues = await listIssuesForWorkspace(workspace)
  return <IssuesShell workspaceSlug={workspace} initialIssues={initialIssues} />
}
