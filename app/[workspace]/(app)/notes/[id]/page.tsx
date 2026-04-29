import { NotesShell } from "@/components/notes/notes-shell"

export const metadata = { title: "Notes" }

export default async function NoteByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <NotesShell initialNoteId={id} />
}
