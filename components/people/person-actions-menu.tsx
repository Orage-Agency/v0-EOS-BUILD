"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import {
  updateMembershipRole,
  suspendMembership,
} from "@/app/actions/people"
import {
  DropdownMenu,
  MenuDivider,
  MenuItem,
  MenuSection,
} from "@/components/orage/dropdown-menu"
import { IcMore } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

const ROLE_OPTIONS: { id: string; label: string }[] = [
  { id: "founder", label: "Founder" },
  { id: "admin", label: "Admin" },
  { id: "leader", label: "Leader" },
  { id: "member", label: "Member" },
  { id: "viewer", label: "Viewer" },
  { id: "field", label: "Field" },
]

export function PersonActionsMenu({
  userId,
  userName,
  currentRole,
  isMaster,
}: {
  userId: string
  userName: string
  currentRole: string
  isMaster?: boolean
}) {
  const slug = useWorkspaceSlug()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState(false)

  async function handleRoleChange(role: string, close: () => void) {
    if (role === currentRole) {
      close()
      return
    }
    setBusy(true)
    const result = await updateMembershipRole(slug, userId, role)
    setBusy(false)
    close()
    if (!result.ok) {
      toast(`Role change failed`, { description: result.error })
      return
    }
    toast(`${userName} → ${role}`)
    router.refresh()
  }

  async function handleSuspend(close: () => void) {
    if (!confirmSuspend) {
      setConfirmSuspend(true)
      toast(`Click suspend again to remove ${userName} from the workspace.`, {
        duration: 3500,
      })
      setTimeout(() => setConfirmSuspend(false), 3500)
      return
    }
    setBusy(true)
    const result = await suspendMembership(slug, userId)
    setBusy(false)
    close()
    setConfirmSuspend(false)
    if (!result.ok) {
      toast(`Suspend failed`, { description: result.error })
      return
    }
    toast(`Suspended ${userName}`, {
      description: "Their access is revoked; their work stays.",
    })
    router.refresh()
  }

  function handleCopyProfileLink(close: () => void) {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/${slug}/people/${userId}`
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Profile link copied"))
      .catch(() => toast("Couldn't copy. Browser blocked clipboard access."))
    close()
  }

  return (
    <DropdownMenu
      align="right"
      width="w-52"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggle()
          }}
          aria-label={`Actions for ${userName}`}
          className="w-7 h-7 rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-3 hover:text-gold-400 transition-colors"
        >
          <IcMore className="w-3.5 h-3.5" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem onClick={() => handleCopyProfileLink(close)}>
            Copy profile link
          </MenuItem>
          <MenuDivider />
          <MenuSection label="ROLE" />
          {ROLE_OPTIONS.map((r) => (
            <MenuItem
              key={r.id}
              active={currentRole === r.id}
              disabled={busy}
              onClick={() => handleRoleChange(r.id, close)}
            >
              {r.label}
            </MenuItem>
          ))}
          <MenuDivider />
          <MenuItem
            danger
            disabled={busy || isMaster}
            onClick={() => handleSuspend(close)}
          >
            <span className={cn(confirmSuspend && "font-semibold")}>
              {confirmSuspend ? "Click again to confirm suspend" : "Suspend member…"}
            </span>
          </MenuItem>
        </>
      )}
    </DropdownMenu>
  )
}
