"use client"

import { useEffect } from "react"
import { useVTOStore } from "@/lib/vto-store"
import { VTOLayout } from "./vto-layout"
import { VisionPanel } from "./vision-panel"
import { TractionPanel } from "./traction-panel"
import { ThreeYearPictureEditor } from "./three-year-picture-editor"
import { TenYearTargetEditor } from "./ten-year-target-editor"
import { PermissionBanner, SectionShell } from "./section-shell"
import { RevisionHistoryDrawer } from "./revision-history-drawer"
import { useUIStore } from "@/lib/store"
import { canEditVto } from "@/lib/permissions"

export function VTOClient({
  workspaceSlug,
  initialData,
}: {
  workspaceSlug: string
  initialData: Record<string, unknown> | null
}) {
  const setWorkspaceSlug = useVTOStore((s) => s.setWorkspaceSlug)
  const hydrate = useVTOStore((s) => s.hydrate)
  const activeTab = useVTOStore((s) => s.activeTab)
  const sessionUser = useUIStore((s) => s.currentUser)

  useEffect(() => {
    setWorkspaceSlug(workspaceSlug)
  }, [workspaceSlug, setWorkspaceSlug])

  useEffect(() => {
    if (initialData) hydrate(initialData)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canEdit = canEditVto({
    id: sessionUser?.id ?? "",
    role: (sessionUser?.role ?? "member") as import("@/types/permissions").Role,
    isMaster: sessionUser?.isMaster ?? false,
  })

  return (
    <VTOLayout>
      {activeTab === "vision" ? <VisionPanel /> : null}
      {activeTab === "traction" ? <TractionPanel /> : null}
      {activeTab === "threeYear" ? (
        <>
          <PermissionBanner show={!canEdit} />
          <SectionShell num={5} title="3-YEAR PICTURE · APR 2029" fullWidth>
            <ThreeYearPictureEditor canEdit={canEdit} />
          </SectionShell>
        </>
      ) : null}
      {activeTab === "tenYear" ? (
        <>
          <PermissionBanner show={!canEdit} />
          <SectionShell num={3} title="10-YEAR TARGET" fullWidth>
            <TenYearTargetEditor canEdit={canEdit} />
          </SectionShell>
        </>
      ) : null}
      <RevisionHistoryDrawer />
    </VTOLayout>
  )
}
