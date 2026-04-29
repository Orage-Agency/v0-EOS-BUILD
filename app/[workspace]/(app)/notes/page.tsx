import { NotesShell } from "@/components/notes/notes-shell"
import { listNotesForWorkspace } from "@/lib/notes-server"

export const metadata = { title: "Notes · Orage Core" }

export default async function NotesPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const initialNotes = await listNotesForWorkspace(workspace)
  return (
    <NotesShell
      workspaceSlug={workspace}
      initialNotes={initialNotes}
    />
  )
}
