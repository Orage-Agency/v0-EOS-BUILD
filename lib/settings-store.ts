"use client"

import { create } from "zustand"

// ============================================================================
// TYPES
// ============================================================================

export type BrandColorId = "gold" | "info" | "success" | "danger" | "purple" | "amber"

export type BrandColor = {
  id: BrandColorId
  label: string
  /** linear-gradient(135deg, from, to) */
  from: string
  to: string
}

export const BRAND_COLORS: BrandColor[] = [
  { id: "gold", label: "Gold (default)", from: "#B68039", to: "#543C1C" },
  { id: "info", label: "Steel Blue", from: "#5A8FAA", to: "#2C4A5C" },
  { id: "success", label: "Forest", from: "#6FAA6B", to: "#3A5E37" },
  { id: "danger", label: "Crimson", from: "#C25450", to: "#6E2E2C" },
  { id: "purple", label: "Plum", from: "#9A6ABF", to: "#4D3361" },
  { id: "amber", label: "Amber", from: "#D4A24A", to: "#7A5B25" },
]

export type AIModel =
  | "claude-opus-4.7"
  | "claude-sonnet-4.6"
  | "claude-haiku-4.5"

export type ContextScope = "full" | "operational" | "minimal"

export type VoiceTone = "direct" | "coaching" | "concise" | "custom"

export type SessionTimeout = "30d" | "7d" | "24h" | "never"

export type IntegrationKey =
  | "slack"
  | "gcal"
  | "n8n"
  | "ghl"
  | "zapier"
  | "linear"
  | "hubspot"
  | "notion"
  | "discord"
  | "webhook"

export type IntegrationStatus = "connected" | "available" | "error"

export type Integration = {
  key: IntegrationKey
  name: string
  description: string
  status: IntegrationStatus
  /** Subtitle when connected, e.g. "ORAGE WORKSPACE" or "4 USERS" */
  meta?: string
  /** Background gradient classes for the logo tile */
  logoFrom: string
  logoTo: string
  logoChar: string
  /** White-on-dark for Notion */
  invertedBorder?: boolean
}

export const INTEGRATIONS: Integration[] = [
  {
    key: "slack",
    name: "Slack",
    description:
      "Auto-post L10 summaries, briefings, and audit alerts to selected channels.",
    status: "connected",
    meta: "ORAGE WORKSPACE",
    logoFrom: "#4A154B",
    logoTo: "#350D36",
    logoChar: "#",
  },
  {
    key: "gcal",
    name: "Google Calendar",
    description:
      "Sync L10s, 1:1s, and AI-suggested focus blocks to team calendars.",
    status: "connected",
    meta: "4 USERS",
    logoFrom: "#4285F4",
    logoTo: "#1A56CC",
    logoChar: "G",
  },
  {
    key: "n8n",
    name: "n8n",
    description:
      "Custom workflow automations · trigger on rocks/issues/scorecard events.",
    status: "connected",
    meta: "12 WORKFLOWS",
    logoFrom: "#EA4B71",
    logoTo: "#B53757",
    logoChar: "n",
  },
  {
    key: "ghl",
    name: "GoHighLevel",
    description:
      "Pull discovery calls, pipeline stages, and conversion metrics into the scorecard.",
    status: "available",
    logoFrom: "#FF8800",
    logoTo: "#CC6E00",
    logoChar: "H",
  },
  {
    key: "zapier",
    name: "Zapier",
    description:
      "Connect to 5,000+ apps via Zapier · Orage is listed in the Zapier marketplace.",
    status: "available",
    logoFrom: "#FF4F00",
    logoTo: "#CC3F00",
    logoChar: "Z",
  },
  {
    key: "linear",
    name: "Linear",
    description:
      "Two-way sync engineering tickets ↔ Orage tasks · keep eng in their flow.",
    status: "available",
    logoFrom: "#5E6AD2",
    logoTo: "#3D4AB1",
    logoChar: "L",
  },
  {
    key: "hubspot",
    name: "HubSpot",
    description:
      "Pull marketing metrics into scorecard · campaign performance + lead quality.",
    status: "available",
    logoFrom: "#FF7A59",
    logoTo: "#CC6147",
    logoChar: "H",
  },
  {
    key: "notion",
    name: "Notion",
    description:
      "Export V/TO + Notes back to Notion · or import existing Notion workspace.",
    status: "available",
    logoFrom: "#1E1E1E",
    logoTo: "#333333",
    logoChar: "N",
    invertedBorder: true,
  },
  {
    key: "discord",
    name: "Discord",
    description:
      "Post briefings + L10 summaries to Discord channels · for community-led teams.",
    status: "available",
    logoFrom: "#5865F2",
    logoTo: "#3540AD",
    logoChar: "D",
  },
  {
    key: "webhook",
    name: "Custom Webhook",
    description:
      "Outbound webhook for any event · build your own integrations on top.",
    status: "available",
    logoFrom: "#B68039",
    logoTo: "#543C1C",
    logoChar: "⌘",
  },
]

export type ApiKey = {
  id: string
  name: string
  prefix: string
  status: "active" | "dev"
  createdAt: string
  lastUsed: string
}

export const API_KEYS: ApiKey[] = [
  {
    id: "k_prod",
    name: "Production Key",
    prefix: "orage_sk_",
    status: "active",
    createdAt: "FEB 14",
    lastUsed: "2H AGO",
  },
  {
    id: "k_dev",
    name: "Development Key",
    prefix: "orage_dk_",
    status: "dev",
    createdAt: "MAR 21",
    lastUsed: "5D AGO",
  },
]

export type CronStatus = "running" | "waiting" | "failing"

export type CronJob = {
  id: string
  name: string
  status: CronStatus
  schedule: string
  meta: string
}

export const CRON_JOBS: CronJob[] = [
  {
    id: "cron_focus",
    name: "Today's Focus Briefing",
    status: "running",
    schedule: "8:00 AM daily",
    meta: "last: 8h ago · success",
  },
  {
    id: "cron_l10",
    name: "Pre-L10 Brief",
    status: "running",
    schedule: "Per-tenant L10 day",
    meta: "last: yesterday",
  },
  {
    id: "cron_health",
    name: "Health Score Compute",
    status: "running",
    schedule: "2:00 AM daily",
    meta: "last: 16h ago",
  },
  {
    id: "cron_risk",
    name: "Risk Flag Detection",
    status: "running",
    schedule: "3:00 AM daily",
    meta: "last: 15h ago",
  },
  {
    id: "cron_friday",
    name: "Friday Digest",
    status: "waiting",
    schedule: "Fri 5:00 PM",
    meta: "next: tomorrow",
  },
  {
    id: "cron_audit",
    name: "Audit Log Cleanup",
    status: "running",
    schedule: "Sun 4:00 AM",
    meta: "last: 4d ago",
  },
]

// ============================================================================
// STORE STATE
// ============================================================================

type WorkspaceState = {
  name: string
  slug: string
  timezone: string
  brandColor: BrandColorId
  l10Day: string
  quarterStart: string
  oneOnOneCadence: string
}

type AIState = {
  model: AIModel
  contextScope: ContextScope
  voiceTone: VoiceTone
  briefings: {
    todaysFocus: boolean
    preL10: boolean
    fridayDigest: boolean
    quarterlyReview: boolean
  }
}

type SecurityState = {
  twoFactor: boolean
  ssoGoogle: boolean
  sessionTimeout: SessionTimeout
  ipAllowlist: string
  revealedKeyId: string | null
}

type NotificationsState = {
  email: {
    dailyDigest: boolean
    taskAssigned: boolean
    mentions: boolean
    weeklyRecap: boolean
  }
  inApp: {
    desktopPush: boolean
    soundEffects: boolean
  }
}

type MasterSystemState = {
  defaultSeatLimit: number
  vtoSeedTemplate: "service" | "agency" | "saas" | "blank"
  defaultAIModel: AIModel
  featureFlags: {
    aiInlineNotes: boolean
    l10AutoSummary: boolean
    voiceModeBeta: boolean
  }
  announcement: string
  lastBroadcast: string
}

type IntegrationsState = {
  /** Currently configured integrations (matches INTEGRATIONS by key) */
  connected: Set<IntegrationKey>
  /** Currently failing integrations (overrides connected status) */
  errored: Set<IntegrationKey>
  /** Drawer state */
  configuring: IntegrationKey | null
}

type DangerState = {
  deleteOpen: boolean
  transferOpen: boolean
}

type SettingsStore = {
  workspace: WorkspaceState
  ai: AIState
  security: SecurityState
  notifications: NotificationsState
  masterSystem: MasterSystemState
  integrations: IntegrationsState
  danger: DangerState

  // Workspace actions
  updateWorkspace: (patch: Partial<WorkspaceState>) => void
  setBrandColor: (color: BrandColorId) => void

  // AI actions
  updateAI: (patch: Partial<AIState>) => void
  toggleBriefing: (key: keyof AIState["briefings"]) => void

  // Security actions
  toggleTwoFactor: () => void
  toggleSSO: () => void
  setSessionTimeout: (t: SessionTimeout) => void
  setIPAllowlist: (v: string) => void
  toggleKeyReveal: (id: string) => void

  // Notifications actions
  toggleEmailPref: (key: keyof NotificationsState["email"]) => void
  toggleInAppPref: (key: keyof NotificationsState["inApp"]) => void

  // Master system actions
  updateMasterSystem: (patch: Partial<MasterSystemState>) => void
  toggleFeatureFlag: (key: keyof MasterSystemState["featureFlags"]) => void
  broadcastAnnouncement: () => void

  // Integration actions
  connectIntegration: (key: IntegrationKey) => void
  disconnectIntegration: (key: IntegrationKey) => void
  openConfigure: (key: IntegrationKey) => void
  closeConfigure: () => void

  // Danger zone
  openDelete: () => void
  closeDelete: () => void
  openTransfer: () => void
  closeTransfer: () => void
}

// ============================================================================
// STORE
// ============================================================================

export const useSettingsStore = create<SettingsStore>((set) => ({
  workspace: {
    name: "Orage Agency LLC",
    slug: "orage",
    timezone: "America/Mexico_City",
    brandColor: "gold",
    l10Day: "monday-9",
    quarterStart: "jan-1",
    oneOnOneCadence: "biweekly",
  },
  ai: {
    model: "claude-opus-4.7",
    contextScope: "full",
    voiceTone: "direct",
    briefings: {
      todaysFocus: true,
      preL10: true,
      fridayDigest: true,
      quarterlyReview: false,
    },
  },
  security: {
    twoFactor: true,
    ssoGoogle: true,
    sessionTimeout: "30d",
    ipAllowlist: "",
    revealedKeyId: null,
  },
  notifications: {
    email: {
      dailyDigest: true,
      taskAssigned: true,
      mentions: true,
      weeklyRecap: false,
    },
    inApp: {
      desktopPush: true,
      soundEffects: false,
    },
  },
  masterSystem: {
    defaultSeatLimit: 25,
    vtoSeedTemplate: "service",
    defaultAIModel: "claude-opus-4.7",
    featureFlags: {
      aiInlineNotes: true,
      l10AutoSummary: true,
      voiceModeBeta: false,
    },
    announcement: "",
    lastBroadcast: "Apr 14 · “AI Implementer launched”",
  },
  integrations: {
    connected: new Set<IntegrationKey>(["slack", "gcal", "n8n"]),
    errored: new Set<IntegrationKey>(),
    configuring: null,
  },
  danger: { deleteOpen: false, transferOpen: false },

  updateWorkspace: (patch) =>
    set((s) => ({ workspace: { ...s.workspace, ...patch } })),
  setBrandColor: (color) =>
    set((s) => ({ workspace: { ...s.workspace, brandColor: color } })),

  updateAI: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),
  toggleBriefing: (key) =>
    set((s) => ({
      ai: {
        ...s.ai,
        briefings: { ...s.ai.briefings, [key]: !s.ai.briefings[key] },
      },
    })),

  toggleTwoFactor: () =>
    set((s) => ({
      security: { ...s.security, twoFactor: !s.security.twoFactor },
    })),
  toggleSSO: () =>
    set((s) => ({
      security: { ...s.security, ssoGoogle: !s.security.ssoGoogle },
    })),
  setSessionTimeout: (t) =>
    set((s) => ({ security: { ...s.security, sessionTimeout: t } })),
  setIPAllowlist: (v) =>
    set((s) => ({ security: { ...s.security, ipAllowlist: v } })),
  toggleKeyReveal: (id) =>
    set((s) => ({
      security: {
        ...s.security,
        revealedKeyId: s.security.revealedKeyId === id ? null : id,
      },
    })),

  toggleEmailPref: (key) =>
    set((s) => ({
      notifications: {
        ...s.notifications,
        email: {
          ...s.notifications.email,
          [key]: !s.notifications.email[key],
        },
      },
    })),
  toggleInAppPref: (key) =>
    set((s) => ({
      notifications: {
        ...s.notifications,
        inApp: {
          ...s.notifications.inApp,
          [key]: !s.notifications.inApp[key],
        },
      },
    })),

  updateMasterSystem: (patch) =>
    set((s) => ({ masterSystem: { ...s.masterSystem, ...patch } })),
  toggleFeatureFlag: (key) =>
    set((s) => ({
      masterSystem: {
        ...s.masterSystem,
        featureFlags: {
          ...s.masterSystem.featureFlags,
          [key]: !s.masterSystem.featureFlags[key],
        },
      },
    })),
  broadcastAnnouncement: () =>
    set((s) => ({
      masterSystem: {
        ...s.masterSystem,
        lastBroadcast: new Date()
          .toLocaleString("en-US", { month: "short", day: "numeric" })
          .toUpperCase(),
        announcement: "",
      },
    })),

  connectIntegration: (key) =>
    set((s) => {
      const next = new Set(s.integrations.connected)
      next.add(key)
      const errs = new Set(s.integrations.errored)
      errs.delete(key)
      return { integrations: { ...s.integrations, connected: next, errored: errs } }
    }),
  disconnectIntegration: (key) =>
    set((s) => {
      const next = new Set(s.integrations.connected)
      next.delete(key)
      return { integrations: { ...s.integrations, connected: next } }
    }),
  openConfigure: (key) =>
    set((s) => ({ integrations: { ...s.integrations, configuring: key } })),
  closeConfigure: () =>
    set((s) => ({ integrations: { ...s.integrations, configuring: null } })),

  openDelete: () => set((s) => ({ danger: { ...s.danger, deleteOpen: true } })),
  closeDelete: () => set((s) => ({ danger: { ...s.danger, deleteOpen: false } })),
  openTransfer: () =>
    set((s) => ({ danger: { ...s.danger, transferOpen: true } })),
  closeTransfer: () =>
    set((s) => ({ danger: { ...s.danger, transferOpen: false } })),
}))
