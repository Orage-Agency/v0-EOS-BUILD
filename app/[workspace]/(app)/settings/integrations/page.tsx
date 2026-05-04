import { listApiKeys } from "@/app/actions/api-keys"
import { listWebhooks } from "@/app/actions/webhooks"
import { IntegrationsShell } from "@/components/settings/integrations-shell"

export const metadata = { title: "Integrations · Settings" }
export const dynamic = "force-dynamic"

export default async function IntegrationsSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const [keysRes, webhooksRes] = await Promise.all([
    listApiKeys(workspace),
    listWebhooks(workspace),
  ])
  return (
    <IntegrationsShell
      workspaceSlug={workspace}
      initialKeys={keysRes.ok ? keysRes.keys : []}
      initialWebhooks={webhooksRes.ok ? webhooksRes.webhooks : []}
    />
  )
}
