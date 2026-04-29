import { HelpShell } from "@/components/help/help-shell"

export const metadata = { title: "Help · Orage Core" }

// The TOC reads its active section from `?section=…`, so we need a runtime
// render. Forcing dynamic also keeps the search results responsive.
export const dynamic = "force-dynamic"

export default function HelpPage() {
  return <HelpShell />
}
