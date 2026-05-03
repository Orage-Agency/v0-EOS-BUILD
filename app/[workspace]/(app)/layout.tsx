import type { ReactNode } from "react"
import { Sidebar } from "@/components/shell/sidebar"
import { Topbar } from "@/components/shell/topbar"
import { CommandPalette } from "@/components/shell/command-palette"
import { AIPanel } from "@/components/shell/ai-panel"
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts"
import { OrageToaster } from "@/components/shell/orage-toaster"
import { BottomTabBar } from "@/components/shell/bottom-tab-bar"
import { OnboardingGate } from "@/components/onboarding/onboarding-gate"
import { SessionInit } from "@/components/shell/session-init"
import { WorkspaceRealtimeBridge } from "@/components/realtime/workspace-realtime-bridge"
import { requireUser } from "@/lib/auth"

/**
 * The (app) layout is the authenticated shell for everything under
 * /[workspace]/. requireUser() resolves the workspace by slug, asserts the
 * caller is signed in AND a member of that workspace, and redirects otherwise
 * (to /[workspace]/login when unauthenticated, to /[workspace]/forbidden
 * when not a member). Pages downstream can re-call requireUser to read the
 * authenticated user — it's memoized via React's `cache()` so it's a single
 * round-trip per request.
 */
export default async function AppShellLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)

  return (
    <div
      className="h-screen overflow-hidden grid grid-cols-1 md:grid-cols-[var(--sidebar-w)_1fr]"
    >
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="grid grid-rows-[var(--topbar-h)_1fr] overflow-hidden min-w-0">
        <Topbar />
        <div className="overflow-y-auto pb-16 md:pb-0">{children}</div>
      </main>
      <BottomTabBar />
      <CommandPalette />
      <AIPanel />
      <KeyboardShortcuts />
      <OrageToaster />
      <OnboardingGate
        workspaceSlug={workspace}
        onboardingCompleted={user.onboardingCompleted}
      />
      <SessionInit
        user={{
          id: user.id,
          name: user.fullName ?? user.email,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isMaster: user.isMaster,
          workspaceSlug: workspace,
          workspaceName: user.workspaceName,
        }}
      />
      <WorkspaceRealtimeBridge tenantId={user.workspaceId} />
    </div>
  )
}
