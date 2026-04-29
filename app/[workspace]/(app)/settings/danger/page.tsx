import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { DangerZone } from "@/components/settings/danger-zone"

export const metadata = { title: "Danger Zone" }

export default async function DangerPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)
  if (!["founder", "owner"].includes(user.role) && !user.isMaster) {
    redirect(`/${workspace}/settings/workspace`)
  }
  return <DangerZone />
}
