import { ScorecardShell } from "@/components/scorecard/scorecard-shell"
import { listScorecardData } from "@/lib/scorecard-server"

export const metadata = {
  title: "Scorecard · Orage Core",
  description: "Weekly metric grid · auto-color by traffic light · click to edit.",
}

export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const { metrics, cells } = await listScorecardData(workspace)
  return <ScorecardShell initialMetrics={metrics} initialCells={cells} />
}
