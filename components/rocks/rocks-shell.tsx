"use client"

import { useEffect } from "react"
import { useRocksStore, type RocksActor } from "@/lib/rocks-store"
import { canEditRocks } from "@/lib/permissions"
import { RocksHeader } from "./rocks-header"
import { SummaryBar } from "./summary-bar"
import { RocksToolbar } from "./rocks-toolbar"
import { RocksBoard } from "./rocks-board"
import { RockDrawer } from "./rock-drawer"
import { NewRockModal } from "./new-rock-modal"
import type { MockRock } from "@/lib/mock-data"
import type { WorkspaceMember } from "@/lib/tasks-server"

type RocksCurrentUser = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
  isMaster: boolean
}

function toActor(user: RocksCurrentUser): RocksActor {
  const validRoles = ["founder", "admin", "leader", "member", "viewer", "field"] as const
  type ValidRole = typeof validRoles[number]
  const roleMap: Record<string, ValidRole> = {
    master: "founder",
    owner: "founder",
    founder: "founder",
    admin: "admin",
    leader: "leader",
    member: "member",
    viewer: "viewer",
  }
  return {
    id: user.id,
    role: roleMap[user.role] ?? "member",
    isMaster: user.isMaster,
  }
}

export function RocksShell({
  workspaceSlug,
  initialRocks,
  members,
  currentUser,
}: {
  workspaceSlug: string
  initialRocks: MockRock[]
  members: WorkspaceMember[]
  currentUser: RocksCurrentUser
}) {
  const setRocks = useRocksStore((s) => s.setRocks)
  const setCurrentActor = useRocksStore((s) => s.setCurrentActor)
  const setWorkspaceSlug = useRocksStore((s) => s.setWorkspaceSlug)
  const setMembers = useRocksStore((s) => s.setMembers)
  const openNewRock = useRocksStore((s) => s.openNewRock)
  const close = useRocksStore((s) => s.closeRock)
  const closeNew = useRocksStore((s) => s.closeNewRock)
  const currentActor = useRocksStore((s) => s.currentActor)

  useEffect(() => {
    setRocks(initialRocks)
  }, [initialRocks, setRocks])

  useEffect(() => {
    setMembers(members)
  }, [members, setMembers])

  useEffect(() => {
    setWorkspaceSlug(workspaceSlug)
  }, [workspaceSlug, setWorkspaceSlug])

  useEffect(() => {
    setCurrentActor(toActor(currentUser))
  }, [currentUser.id, currentUser.role, currentUser.isMaster, setCurrentActor]) // eslint-disable-line react-hooks/exhaustive-deps

  const allowed = currentActor ? canEditRocks(currentActor) : false

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (e.key === "Escape") {
        close()
        closeNew()
        return
      }
      if (!inField && (e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
        if (!allowed) return
        e.preventDefault()
        openNewRock()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [allowed, close, closeNew, openNewRock])

  return (
    <div className="flex h-full flex-col">
      <RocksHeader />
      <SummaryBar />
      <div className="mt-4">
        <RocksToolbar />
      </div>
      <RocksBoard />
      <RockDrawer />
      <NewRockModal
        workspaceSlug={workspaceSlug}
        members={members}
        currentUser={currentUser}
      />
    </div>
  )
}
