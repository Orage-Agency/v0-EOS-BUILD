import { IssuesShell } from "@/components/issues/issues-shell"

export const metadata = {
  title: "Issues · Orage Core",
  description: "IDS queue · drag to reorder · resolve into Rock, Task, Decision, or Archive.",
}

export default function IssuesPage() {
  return <IssuesShell />
}
