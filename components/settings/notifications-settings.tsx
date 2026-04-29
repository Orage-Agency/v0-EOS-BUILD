"use client"

import { useSettingsStore } from "@/lib/settings-store"
import { OrageToggle } from "@/components/orage/toggle"
import { SectionBlock, SCard, FieldRow } from "./ui"

const EMAIL_PREFS: {
  key: keyof ReturnType<
    typeof useSettingsStore.getState
  >["notifications"]["email"]
  name: string
  hint: string
}[] = [
  {
    key: "dailyDigest",
    name: "Daily Digest",
    hint: "8:00 AM your time zone · today's priorities + open items",
  },
  {
    key: "taskAssigned",
    name: "Task Assigned",
    hint: "Email when someone assigns you a task",
  },
  {
    key: "mentions",
    name: "Mentions",
    hint: "When someone @mentions you in a note or issue",
  },
  {
    key: "weeklyRecap",
    name: "Weekly Recap",
    hint: "Friday 5:00 PM · what shipped this week",
  },
]

const IN_APP_PREFS: {
  key: keyof ReturnType<
    typeof useSettingsStore.getState
  >["notifications"]["inApp"]
  name: string
  hint: string
}[] = [
  {
    key: "desktopPush",
    name: "Desktop Push",
    hint: "Browser notifications when desktop is active",
  },
  {
    key: "soundEffects",
    name: "Sound Effects",
    hint: "Subtle audio cues for actions and alerts",
  },
]

export function NotificationsSettings() {
  const notifications = useSettingsStore((s) => s.notifications)
  const toggleEmailPref = useSettingsStore((s) => s.toggleEmailPref)
  const toggleInAppPref = useSettingsStore((s) => s.toggleInAppPref)

  return (
    <SectionBlock
      title="NOTIFICATIONS"
      description="Per-user preferences · how Orage Core reaches you"
    >
      <SCard title="EMAIL">
        {EMAIL_PREFS.map((p) => (
          <FieldRow
            key={p.key}
            name={p.name}
            hint={p.hint}
            control={
              <OrageToggle
                on={notifications.email[p.key]}
                onChange={() => toggleEmailPref(p.key)}
                label={p.name}
              />
            }
          />
        ))}
      </SCard>

      <SCard title="IN-APP">
        {IN_APP_PREFS.map((p) => (
          <FieldRow
            key={p.key}
            name={p.name}
            hint={p.hint}
            control={
              <OrageToggle
                on={notifications.inApp[p.key]}
                onChange={() => toggleInAppPref(p.key)}
                label={p.name}
              />
            }
          />
        ))}
      </SCard>
    </SectionBlock>
  )
}
