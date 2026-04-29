"use client"

import { useVTOStore } from "@/lib/vto-store"
import { VTOLayout } from "@/components/vto/vto-layout"
import { VisionPanel } from "@/components/vto/vision-panel"
import { TractionPanel } from "@/components/vto/traction-panel"
import { ThreeYearPictureEditor } from "@/components/vto/three-year-picture-editor"
import { TenYearTargetEditor } from "@/components/vto/ten-year-target-editor"
import {
  PermissionBanner,
  SectionShell,
} from "@/components/vto/section-shell"
import { RevisionHistoryDrawer } from "@/components/vto/revision-history-drawer"
import { CURRENT_USER } from "@/lib/mock-data"
import { canEditVto } from "@/lib/permissions"

export default function VTOPage() {
  const activeTab = useVTOStore((s) => s.activeTab)

  const canEdit = canEditVto({
    id: CURRENT_USER.id,
    role: CURRENT_USER.role,
    isMaster: CURRENT_USER.isMaster,
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
