import { redirect } from "next/navigation"
import { CURRENT_USER } from "@/lib/mock-data"
import { DangerZone } from "@/components/settings/danger-zone"

export const metadata = { title: "Danger Zone" }

export default function DangerPage() {
  if (CURRENT_USER.role !== "founder" && !CURRENT_USER.isMaster) {
    redirect("/settings/workspace")
  }
  return <DangerZone />
}
