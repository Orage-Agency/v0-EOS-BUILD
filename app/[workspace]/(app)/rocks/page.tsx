import { requireUser } from "@/lib/auth"
import { listRocksForWorkspace } from "@/lib/rocks-server"
import { listWorkspaceMembers } from "@/lib/tasks-server"
import { RocksShell } from "@/components/rocks/rocks-shell"

export const metadata = { title: "Rocks · Orage Core" }

export default async function RocksPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const [user, initialRocks, members] = await Promise.all([
    requireUser(workspace),
    listRocksForWorkspace(workspace),
    listWorkspaceMembers(workspace),
  ])

  return (
    <RocksShell
      workspaceSlug={workspace}
      initialRocks={initialRocks}
      members={members}
      currentUser={{
        id: user.id,
        name: user.fullName ?? user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isMaster: user.isMaster,
      }}
    />
  )
}
