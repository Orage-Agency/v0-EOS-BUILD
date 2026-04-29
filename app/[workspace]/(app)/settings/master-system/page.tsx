import { redirect } from "next/navigation"
import { CURRENT_USER } from "@/lib/mock-data"
import { MasterSystemSettings } from "@/components/settings/master-system-settings"

export const metadata = { title: "Master System" }

export default function MasterSystemPage() {
  if (!CURRENT_USER.isMaster) redirect("/settings/workspace")
  return <MasterSystemSettings />
}
