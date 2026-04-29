import { ProfileShell } from "@/components/people/profile-shell"

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProfileShell userId={id} />
}
