"use client"

import { useEffect, useRef } from "react"
import { useTasksStore } from "@/lib/tasks-store"
import type { MockTask } from "@/lib/mock-data"
import type { RockOption, WorkspaceMember } from "@/lib/tasks-server"
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

export function TasksShell({
  workspaceSlug,
  initialTasks,
  members,
  rocks,
  currentUser,
}: {
  workspaceSlug: string
  initialTasks: MockTask[]
  members: WorkspaceMember[]
  rocks: RockOption[]
  currentUser: CurrentUserCard
}) {
  const view = useTasksStore((s) => s.view)
  const setTasks = useTasksStore((s) => s.setTasks)
  const setCurrentUserId = useTasksStore((s) => s.setCurrentUserId)
  const setRockOptions = useTasksStore((s) => s.setRockOptions)
  const setMembers = useTasksStore((s) => s.setMembers)
  const setWorkspaceSlug = useTasksStore((s) => s.setWorkspaceSlug)
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

  return (
    <div className="flex h-full flex-col">
      <TasksHeader
        onQuickAddFocus={() => quickAddRef.current?.focus()}
        onNewTask={openNewTask}
      />
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
