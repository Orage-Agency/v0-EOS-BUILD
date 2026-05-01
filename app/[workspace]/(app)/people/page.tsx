import { DirectoryShell } from "@/components/people/directory-shell"
import { listWorkspaceMembers } from "@/lib/people-server"

// Reads the authenticated user via cookies → must run at request time,
// not at build time, otherwise listWorkspaceMembers returns [] because
// requireUser has no session and the page falls back to USERS mock.
export const dynamic = "force-dynamic"

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const members = await listWorkspaceMembers(workspace)
  return <DirectoryShell initialMembers={members} />
}
