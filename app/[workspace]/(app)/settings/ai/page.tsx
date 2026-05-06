import { AISettings } from "@/components/settings/ai-settings"
import { getAISettings } from "@/app/actions/ai-settings"

export const metadata = { title: "AI" }
export const dynamic = "force-dynamic"

export default async function AISettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const settings = await getAISettings(workspace)
  return <AISettings workspaceSlug={workspace} initial={settings} />
}
