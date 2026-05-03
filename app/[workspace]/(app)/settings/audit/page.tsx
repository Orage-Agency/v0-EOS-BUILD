import { requireUser } from "@/lib/auth"
import { listAuditForWorkspace } from "@/lib/audit-server"
import { AuditViewer } from "@/components/audit/audit-viewer"

export const metadata = { title: "Audit Log · Orage Core" }

export default async function AuditPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)

  // Founders/admins/leaders see everything. Members see their own actions.
  // The DB call is unfiltered; the client-side viewer scopes if non-admin.
  const all = await listAuditForWorkspace(workspace, { limit: 200 })
  const isAdmin =
    user.isMaster || ["founder", "admin", "leader"].includes(user.role)
  const rows = isAdmin ? all : all.filter((r) => r.actor.id === user.id)

  return <AuditViewer rows={rows} canSeeAll={isAdmin} />
}
