import { TasksShell } from "@/components/tasks/tasks-shell"
import {
  listActiveRocks,
  listTasksForWorkspace,
  listWorkspaceMembers,
  listMyStarredTaskIds,
} from "@/lib/tasks-server"
import { listClientTagOptions } from "@/lib/client-tags"
import { requireUser } from "@/lib/auth"

export const metadata = { title: "Tasks · Orage Core" }

// The tasks toolbar reads ?filter=… via useSearchParams, which forces a
// client-side bailout during static prerender. Marking the route dynamic
// keeps the build green and lets the URL drive filter state.
export const dynamic = "force-dynamic"

export default async function TasksPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)
  const [tasks, members, rocks, clientTagOptions, starredIds] = await Promise.all([
    listTasksForWorkspace(workspace),
    listWorkspaceMembers(workspace),
    listActiveRocks(workspace),
    listClientTagOptions(workspace),
    listMyStarredTaskIds(workspace, user.id),
  ])

  return (
    <TasksShell
      workspaceSlug={workspace}
      initialTasks={tasks}
      members={members}
      rocks={rocks}
      clientTagOptions={clientTagOptions}
      starredIds={starredIds}
      currentUser={{
        id: user.id,
        name: user.fullName ?? user.email,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }}
    />
  )
}
