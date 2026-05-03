import { RunnerShell } from "@/components/l10/runner/runner-shell"
import { Toaster } from "sonner"
import { listRocksForWorkspace } from "@/lib/rocks-server"
import { listScorecardData } from "@/lib/scorecard-server"
import { listWorkspaceMembers, listTasksForWorkspace } from "@/lib/tasks-server"
import { dueLabel } from "@/lib/format"
import type { SegmentData } from "@/components/l10/runner/segment-views"

export default async function RunnerPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = await params

  // Load every data source the segment views need so the runner can flip
  // between SCORECARD / ROCK REVIEW / TO-DOS without round-trips.
  const [rocks, scorecard, members, allTasks] = await Promise.all([
    listRocksForWorkspace(workspace),
    listScorecardData(workspace),
    listWorkspaceMembers(workspace),
    listTasksForWorkspace(workspace).catch(() => []),
  ])
  const openTasks = allTasks.filter((t) => t.status === "open" || t.status === "in_progress")

  const membersById = Object.fromEntries(
    members.map((m) => [m.id, { name: m.name, initials: m.initials }]),
  )

  const segmentData: SegmentData = {
    rocks,
    scorecard,
    membersById,
    openTasks: openTasks.map((t) => {
      const owner = t.owner ? members.find((m) => m.id === t.owner) : null
      const due = dueLabel(t.due)
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        ownerName: owner?.name ?? null,
        dueLabel: due.label === "NO DUE DATE" ? null : due.label,
      }
    }),
  }

  return (
    <>
      <RunnerShell id={id} workspaceSlug={workspace} segmentData={segmentData} />
      <Toaster
        position="bottom-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(20,20,20,0.95)",
            border: "1px solid var(--gold-500)",
            color: "var(--gold-400)",
            fontFamily: "Bebas Neue",
            letterSpacing: "0.15em",
            fontSize: "11px",
          },
        }}
      />
    </>
  )
}
