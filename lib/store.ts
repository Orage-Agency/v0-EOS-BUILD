"use client"

/**
 * Orage Core · Client UI state
 * Active tenant, command palette, AI panel, and other shell-level toggles.
 * Replace tenant persistence with a server-side cookie once auth is wired.
 */

import { create } from "zustand"
import { DEFAULT_TENANT_ID } from "@/lib/tenants"

type UIState = {
  activeTenantId: string
  setActiveTenant: (id: string) => void

  commandOpen: boolean
  openCommand: () => void
  closeCommand: () => void
  toggleCommand: () => void

  aiPanelOpen: boolean
  openAiPanel: () => void
  closeAiPanel: () => void
  toggleAiPanel: () => void

  quickAddOpen: boolean
  setQuickAddOpen: (open: boolean) => void

  newRockModalOpen: boolean
  openNewRockModal: () => void
  closeNewRockModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTenantId: DEFAULT_TENANT_ID,
  setActiveTenant: (id) => set({ activeTenantId: id }),

  commandOpen: false,
  openCommand: () => set({ commandOpen: true }),
  closeCommand: () => set({ commandOpen: false }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

  aiPanelOpen: false,
  openAiPanel: () => set({ aiPanelOpen: true }),
  closeAiPanel: () => set({ aiPanelOpen: false }),
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),

  quickAddOpen: false,
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),

  newRockModalOpen: false,
  openNewRockModal: () => set({ newRockModalOpen: true }),
  closeNewRockModal: () => set({ newRockModalOpen: false }),
}))
