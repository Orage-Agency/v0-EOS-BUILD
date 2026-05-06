"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { useSettingsStore } from "@/lib/settings-store"
import {
  SectionBlock,
  SCard,
  SecondaryButton,
  DangerButton,
} from "./ui"
import { DeleteWorkspaceModal } from "./delete-workspace-modal"
import { exportMyData } from "@/app/actions/data-export"

export function DangerZone() {
  const openDelete = useSettingsStore((s) => s.openDelete)
  const params = useParams<{ workspace: string }>()
  const workspaceSlug = params?.workspace ?? ""
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (exporting || !workspaceSlug) return
    setExporting(true)
    try {
      const res = await exportMyData(workspaceSlug)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      // Trigger an in-browser download — no server-side storage needed for
      // a per-user export, the JSON is small enough to ship inline.
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `orage-core-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Export downloaded")
    } finally {
      setExporting(false)
    }
  }

  return (
    <SectionBlock
      title="DANGER ZONE"
      titleClassName="text-danger"
      description="Irreversible actions · all require 2FA confirmation"
    >
      <SCard title="EXPORT MY DATA" variant="danger">
        <DangerRow
          title="Download a JSON dump of everything tagged to my account"
          description="Includes profile, memberships, every Rock/Task/Issue/Note you own or created, your scorecard metrics, your audit-log entries, AI conversations, and trusted devices. Per-user GDPR-style export — does not include teammates' data."
          action={
            <SecondaryButton
              data-testid="danger-export-my-data"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "Generating…" : "Download Export"}
            </SecondaryButton>
          }
        />
      </SCard>

      <SCard title="TRANSFER OWNERSHIP" variant="danger">
        <DangerRow
          title="Pass workspace to another founder"
          description="Selected member becomes the primary Founder · you become Admin. Cannot be undone without their consent."
          action={
            <DangerButton
              data-testid="danger-transfer-ownership"
              onClick={() => toast("TRANSFER · 2FA REQUIRED")}
            >
              Transfer
            </DangerButton>
          }
        />
      </SCard>

      <SCard title="DELETE WORKSPACE" variant="danger">
        <DangerRow
          title="Permanently delete this tenant"
          description="All data destroyed after 30-day grace period · no recovery possible after grace ends. Type the workspace name to confirm."
          action={
            <DangerButton
              data-testid="danger-delete-workspace"
              onClick={openDelete}
            >
              Delete
            </DangerButton>
          }
        />
      </SCard>

      <DeleteWorkspaceModal />
    </SectionBlock>
  )
}

function DangerRow({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center gap-[18px] flex-wrap">
      <div className="flex-1 min-w-[260px]">
        <div className="text-[13px] text-text-primary mb-1">{title}</div>
        <div className="text-[11px] text-text-muted leading-relaxed">
          {description}
        </div>
      </div>
      {action}
    </div>
  )
}
