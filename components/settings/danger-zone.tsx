"use client"

import { toast } from "sonner"
import { useSettingsStore } from "@/lib/settings-store"
import {
  SectionBlock,
  SCard,
  SecondaryButton,
  DangerButton,
} from "./ui"
import { DeleteWorkspaceModal } from "./delete-workspace-modal"

export function DangerZone() {
  const openDelete = useSettingsStore((s) => s.openDelete)

  return (
    <SectionBlock
      title="DANGER ZONE"
      titleClassName="text-danger"
      description="Irreversible actions · all require 2FA confirmation"
    >
      <SCard title="EXPORT ALL DATA" variant="danger">
        <DangerRow
          title="Download a full backup"
          description="JSON export of every Rock, Issue, Task, Note, Meeting, V/TO revision, and audit log. Generates within 1 hour. Email link sent when ready."
          action={
            <SecondaryButton
              onClick={() => toast("EXPORT QUEUED · EMAIL WHEN READY")}
            >
              Request Export
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
          action={<DangerButton onClick={openDelete}>Delete</DangerButton>}
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
