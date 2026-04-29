import { VTOClient } from "@/components/vto/vto-client"
import { getVTOData } from "@/lib/vto-server"

export default async function VTOPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const initialData = await getVTOData(workspace)
  return <VTOClient workspaceSlug={workspace} initialData={initialData} />
}
