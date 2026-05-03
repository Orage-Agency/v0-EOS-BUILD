import { requireUser } from "@/lib/auth"
import { getSsoConfig } from "@/app/actions/sso"
import { SsoSettings } from "@/components/settings/sso-settings"
import { redirect } from "next/navigation"

export const metadata = { title: "Single Sign-On · Orage Core" }

export default async function SsoPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)
  const isAdmin =
    user.isMaster || ["founder", "admin", "owner"].includes(user.role)
  if (!isAdmin) {
    redirect(`/${workspace}/settings`)
  }
  const cfg = await getSsoConfig(workspace)
  return <SsoSettings workspaceSlug={workspace} initial={cfg} />
}
