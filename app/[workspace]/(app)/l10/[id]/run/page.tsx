import { RunnerShell } from "@/components/l10/runner/runner-shell"
import { Toaster } from "sonner"

export default async function RunnerPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = await params
  return (
    <>
      <RunnerShell id={id} workspaceSlug={workspace} />
      <Toaster
        position="bottom-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(20,20,20,0.95)",
            border: "1px solid var(--gold-500)",
            color: "var(--gold-400)",
            fontFamily: "Bebas Neue",
            letterSpacing: "0.15em",
            fontSize: "11px",
          },
        }}
      />
    </>
  )
}
