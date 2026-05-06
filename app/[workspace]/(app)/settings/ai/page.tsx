import { AISettings } from "@/components/settings/ai-settings"
import { AIUsageCard } from "@/components/settings/ai-usage-card"
import { getAIUsage, getAISettings } from "@/app/actions/ai-settings"

export const metadata = { title: "AI" }
export const dynamic = "force-dynamic"

export default async function AISettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const [settings, usage] = await Promise.all([
    getAISettings(workspace),
    getAIUsage(workspace),
  ])
  return (
    <>
      <AISettings workspaceSlug={workspace} initial={settings} />
      <AIUsageCard usage={usage} />
    </>
  )
}
