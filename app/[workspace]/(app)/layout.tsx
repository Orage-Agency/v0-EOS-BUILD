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
import { AiPrewarm } from "@/components/shell/ai-prewarm"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { WorkspaceRealtimeBridge } from "@/components/realtime/workspace-realtime-bridge"
import { requireUser, getUserWorkspaces } from "@/lib/auth"

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
  const allWorkspaces = await getUserWorkspaces()

  // The onboarding wizard mounts when BOTH the user hasn't finished
  // AND the workspace's V/TO is empty. We compute the per-workspace
  // half here so an invited member never sees the founder's wizard.
  // Cheap query — single row by id.
  const { data: vtoRow } = await supabaseAdmin()
    .from("workspaces")
    .select("vto_data")
    .eq("id", user.workspaceId)
    .maybeSingle()
  const vto = (vtoRow?.vto_data ?? {}) as Record<string, unknown>
  const workspaceAlreadySetup = Boolean(
    (typeof vto.purpose === "string" && vto.purpose.trim()) ||
      (typeof vto.niche === "string" && vto.niche.trim()) ||
      (typeof vto.tenYearTarget === "string" && vto.tenYearTarget.trim()) ||
      (Array.isArray(vto.coreValues) &&
        vto.coreValues.some((v) => typeof v === "string" && v.trim())) ||
      (Array.isArray(vto.oneYearGoals) &&
        vto.oneYearGoals.some((v) => typeof v === "string" && v.trim())),
  )
  const currentWorkspace = {
    id: user.workspaceId,
    slug: user.workspaceSlug,
    name: user.workspaceName,
    brand_color:
      allWorkspaces.find((w) => w.id === user.workspaceId)?.brand_color ?? null,
  }

  return (
    <div
      className="h-screen overflow-hidden grid grid-cols-1 md:grid-cols-[var(--sidebar-w)_1fr]"
    >
      <div className="hidden md:block">
        <Sidebar
          workspaces={allWorkspaces.map((w) => ({
            id: w.id,
            slug: w.slug,
            name: w.name,
            brand_color: w.brand_color,
          }))}
          currentWorkspace={currentWorkspace}
        />
      </div>
      <main className="grid grid-rows-[var(--topbar-h)_1fr] overflow-hidden min-w-0">
        <Topbar />
        <div className="overflow-y-auto pb-16 md:pb-0">{children}</div>
      </main>
      <BottomTabBar
        workspaces={allWorkspaces.map((w) => ({
          id: w.id,
          slug: w.slug,
          name: w.name,
          brand_color: w.brand_color,
        }))}
        currentWorkspace={currentWorkspace}
      />
      <CommandPalette />
      <AIPanel />
      <KeyboardShortcuts />
      <OrageToaster />
      <OnboardingGate
        workspaceSlug={workspace}
        onboardingCompleted={user.onboardingCompleted}
        workspaceAlreadySetup={workspaceAlreadySetup}
        isWorkspaceCreator={
          user.role === "founder" ||
          user.role === "owner" ||
          user.role === "master"
        }
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
      <AiPrewarm />
    </div>
  )
}
