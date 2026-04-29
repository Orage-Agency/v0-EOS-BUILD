import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { MasterSystemSettings } from "@/components/settings/master-system-settings"

export const metadata = { title: "Master System" }

export default async function MasterSystemPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)
  if (!user.isMaster) redirect(`/${workspace}/settings/workspace`)
  return <MasterSystemSettings />
}
