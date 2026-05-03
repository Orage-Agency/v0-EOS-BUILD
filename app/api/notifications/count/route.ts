import { NextResponse } from "next/server"
import { countUnread, listInbox } from "@/lib/notifications-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }
  try {
    const [count, recent] = await Promise.all([
      countUnread(slug),
      listInbox(slug, { limit: 10 }),
    ])
    return NextResponse.json({ count, recent })
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err
    return NextResponse.json(
      { count: 0, recent: [], error: "Could not load notifications" },
      { status: 200 },
    )
  }
}
