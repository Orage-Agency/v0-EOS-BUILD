import { listTrash } from "@/lib/trash-server"
import { TrashShell } from "@/components/trash/trash-shell"

export const metadata = { title: "Trash · Orage Core" }
export const dynamic = "force-dynamic"

export default async function TrashPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const items = await listTrash(workspace)
  return <TrashShell workspaceSlug={workspace} items={items} />
}
