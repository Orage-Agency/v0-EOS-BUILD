import { DirectoryShell } from "@/components/people/directory-shell"
import { listWorkspaceMembers } from "@/lib/people-server"

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const members = await listWorkspaceMembers(workspace)
  return <DirectoryShell initialMembers={members} />
}
