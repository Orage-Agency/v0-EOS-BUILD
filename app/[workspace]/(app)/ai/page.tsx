import { AIShell } from "@/components/ai/ai-shell"

export const metadata = {
  title: "AI Implementer · Orage Core",
}

export default function AIImplementerPage() {
  return (
    <div className="h-[calc(100dvh-var(--topbar-h))] overflow-hidden">
      <AIShell />
    </div>
  )
}
