"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useTasksStore } from "@/lib/tasks-store"
import type { MockTask } from "@/lib/mock-data"
import type { RockOption, WorkspaceMember } from "@/lib/tasks-server"
import type { ClientTagOption } from "@/lib/client-tags"
import { TasksHeader } from "./tasks-header"
import { ViewTabs } from "./view-tabs"
import { TasksToolbar } from "./tasks-toolbar"
import { TaskListView } from "./task-list-view"
import { BoardView } from "./board-view"
import { CalendarView } from "./calendar-view"
import { TimelineView } from "./timeline-view"
import { TaskDrawer } from "./task-drawer"
import { HandoffModal } from "./handoff-modal"
import { BulkActionBar } from "./bulk-action-bar"
import { NewTaskModal, type CurrentUserCard } from "./new-task-modal"
import type { QuickAddHandle } from "./quick-add-row"
import { HelpTip } from "@/components/help/help-tip"

export function TasksShell({
  workspaceSlug,
  initialTasks,
  members,
  rocks,
  clientTagOptions,
  starredIds,
  currentUser,
}: {
  workspaceSlug: string
  initialTasks: MockTask[]
  members: WorkspaceMember[]
  rocks: RockOption[]
  clientTagOptions: ClientTagOption[]
  starredIds: string[]
  currentUser: CurrentUserCard
}) {
  const view = useTasksStore((s) => s.view)
  const setTasks = useTasksStore((s) => s.setTasks)
  const setCurrentUserId = useTasksStore((s) => s.setCurrentUserId)
  const setRockOptions = useTasksStore((s) => s.setRockOptions)
  const setMembers = useTasksStore((s) => s.setMembers)
  const setClientTagOptions = useTasksStore((s) => s.setClientTagOptions)
  const setWorkspaceSlug = useTasksStore((s) => s.setWorkspaceSlug)
  const setStarred = useTasksStore((s) => s.setStarred)
  const openNewTask = useTasksStore((s) => s.openNewTask)
  const quickAddRef = useRef<QuickAddHandle | null>(null)

  useEffect(() => {
    setWorkspaceSlug(workspaceSlug)
  }, [workspaceSlug, setWorkspaceSlug])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks, setTasks])

  useEffect(() => {
    setCurrentUserId(currentUser.id)
  }, [currentUser.id, setCurrentUserId])

  useEffect(() => {
    setRockOptions(rocks)
  }, [rocks, setRockOptions])

  useEffect(() => {
    setMembers(members)
  }, [members, setMembers])

  useEffect(() => {
    setClientTagOptions(clientTagOptions)
  }, [clientTagOptions, setClientTagOptions])

  useEffect(() => {
    setStarred(starredIds)
  }, [starredIds, setStarred])

  // Allow deep-linking to a specific task drawer via ?task=<id> — used by
  // the dashboard MY STARRED widget to "open and focus" a starred task.
  const searchParams = useSearchParams()
  const openTask = useTasksStore((s) => s.openTask)
  useEffect(() => {
    const id = searchParams?.get("task")
    if (id) openTask(id)
  }, [searchParams, openTask])

  return (
    <div className="flex h-full flex-col">
      <TasksHeader
        onQuickAddFocus={() => quickAddRef.current?.focus()}
        onNewTask={openNewTask}
      />
      <div className="px-4 md:px-8 mt-3">
        <HelpTip
          id="tasks.handoff"
          title="Reassigning tasks"
          body="Click any task's owner avatar to hand it off — you'll be asked for a context note so the next owner picks up where you left off. Tag the task with a client (Quintessa, Boomer, OKC) for a colored dot."
        />
      </div>
      <ViewTabs />
      {view === "list" && <TasksToolbar />}
      <BulkActionBar />
      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "list" && <TaskListView quickAddRef={quickAddRef} />}
        {view === "board" && <BoardView />}
        {view === "calendar" && <CalendarView />}
        {view === "timeline" && <TimelineView />}
      </div>
      <TaskDrawer />
      <HandoffModal />
      <NewTaskModal
        workspaceSlug={workspaceSlug}
        members={members}
        rocks={rocks}
        currentUser={currentUser}
      />
    </div>
  )
}
