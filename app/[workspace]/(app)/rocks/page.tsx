import { requireUser } from "@/lib/auth"
import {
  listLinkedTasksForWorkspace,
  listMilestonesForWorkspace,
  listRocksForWorkspace,
} from "@/lib/rocks-server"
import { listWorkspaceMembers } from "@/lib/tasks-server"
import { listClientTagOptions } from "@/lib/client-tags"
import { RocksShell } from "@/components/rocks/rocks-shell"

export const metadata = { title: "Rocks · Orage Core" }

export default async function RocksPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const [user, initialRocks, members, milestones, linkedTasks, clientTagOptions] =
    await Promise.all([
      requireUser(workspace),
      listRocksForWorkspace(workspace),
      listWorkspaceMembers(workspace),
      listMilestonesForWorkspace(workspace),
      listLinkedTasksForWorkspace(workspace),
      listClientTagOptions(workspace),
    ])

  return (
    <RocksShell
      workspaceSlug={workspace}
      initialRocks={initialRocks}
      members={members}
      initialMilestones={milestones}
      initialLinkedTasks={linkedTasks}
      clientTagOptions={clientTagOptions}
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
