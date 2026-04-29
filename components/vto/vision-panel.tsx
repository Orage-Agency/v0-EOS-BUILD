"use client"

/**
 * The 6-question Vision grid + 7th rocks rollup. Wires every "Ask AI"
 * button to the shared critique modal and routes the resulting accepted
 * suggestion back into the right slice of the store.
 */

import { useUIStore } from "@/lib/store"
import { canEditVto } from "@/lib/permissions"
import { useVTOStore, type VTOSection } from "@/lib/vto-store"
import { CoreValuesEditor } from "./core-values-editor"
import { CoreFocusEditor } from "./core-focus-editor"
import { TenYearTargetEditor } from "./ten-year-target-editor"
import { MarketingStrategyEditor } from "./marketing-strategy-editor"
import { ThreeYearPictureEditor } from "./three-year-picture-editor"
import { OneYearPlanEditor } from "./one-year-plan-editor"
import { RocksRollup } from "./rocks-rollup"
import { AICritiqueModal } from "./ai-critique-modal"
import { PermissionBanner, SectionShell } from "./section-shell"

export function VisionPanel() {
  const openAI = useVTOStore((s) => s.openAI)
  const setPurpose = useVTOStore((s) => s.setPurpose)
  const setNiche = useVTOStore((s) => s.setNiche)
  const setTenYearTarget = useVTOStore((s) => s.setTenYearTarget)
  const setTargetMarket = useVTOStore((s) => s.setTargetMarket)
  const setBigPicture = useVTOStore((s) => s.setBigPicture)
  const purpose = useVTOStore((s) => s.purpose)
  const niche = useVTOStore((s) => s.niche)
  const tenYearTarget = useVTOStore((s) => s.tenYearTarget)
  const targetMarket = useVTOStore((s) => s.targetMarket)
  const bigPicture = useVTOStore((s) => s.bigPicture)
  const goals = useVTOStore((s) => s.goals)

  const sessionUser = useUIStore((s) => s.currentUser)
  const canEdit = canEditVto({
    id: sessionUser?.id ?? "",
    role: sessionUser?.role as import("@/types/permissions").Role ?? "member",
    isMaster: sessionUser?.isMaster ?? false,
  })

  function handleApply(section: VTOSection, value: string) {
    if (!value) return
    switch (section) {
      case "values":
        // For Core Values the AI returns a single line — append it as a new value.
        // Better behavior handled in the store, but we keep this safe.
        break
      case "focus":
        setPurpose(value)
        break
      case "tenyear":
        setTenYearTarget(value)
        break
      case "marketing":
        setTargetMarket(value)
        break
      case "threeyear":
        setBigPicture(value)
        break
      case "oneyear":
        // Append/refine niche-style — apply to purpose to seed the doc.
        // (1-year plan is structured; AI suggestion is illustrative.)
        setNiche(value)
        break
      case "rocks":
        break
    }
  }

  return (
    <>
      <PermissionBanner show={!canEdit} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionShell
          num={1}
          title="CORE VALUES"
          canAskAI
          onAskAI={() =>
            openAI(
              "values",
              "Bias to Build · Reputation > Revenue · Show The Work · Compound Quality · Direct With Care",
            )
          }
        >
          <CoreValuesEditor canEdit={canEdit} />
        </SectionShell>

        <SectionShell
          num={2}
          title="CORE FOCUS"
          canAskAI
          onAskAI={() => openAI("focus", `${purpose}\n\n${niche}`)}
        >
          <CoreFocusEditor canEdit={canEdit} />
        </SectionShell>

        <SectionShell
          num={3}
          title="10-YEAR TARGET"
          canAskAI
          onAskAI={() => openAI("tenyear", tenYearTarget)}
        >
          <TenYearTargetEditor canEdit={canEdit} />
        </SectionShell>

        <SectionShell
          num={4}
          title="MARKETING STRATEGY"
          canAskAI
          onAskAI={() => openAI("marketing", targetMarket)}
        >
          <MarketingStrategyEditor canEdit={canEdit} />
        </SectionShell>

        <SectionShell
          num={5}
          title="3-YEAR PICTURE · APR 2029"
          fullWidth
          canAskAI
          onAskAI={() => openAI("threeyear", bigPicture)}
        >
          <ThreeYearPictureEditor canEdit={canEdit} />
        </SectionShell>

        <SectionShell
          num={6}
          title="1-YEAR PLAN · APR 2027"
          fullWidth
          canAskAI
          onAskAI={() =>
            openAI("oneyear", goals.map((g, i) => `${i + 1}. ${g.text}`).join("\n"))
          }
        >
          <OneYearPlanEditor canEdit={canEdit} />
        </SectionShell>

        <SectionShell num={7} title="QUARTERLY ROCKS · Q2 2026" fullWidth>
          <RocksRollup />
        </SectionShell>
      </div>

      <AICritiqueModal onApply={handleApply} />
    </>
  )
}
