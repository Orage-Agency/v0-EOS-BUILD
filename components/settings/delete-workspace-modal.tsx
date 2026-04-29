"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useSettingsStore } from "@/lib/settings-store"
import {
  SecondaryButton,
  DangerButton,
  InputField,
} from "./ui"
import { cn } from "@/lib/utils"

const TWO_FA_LEN = 6

export function DeleteWorkspaceModal() {
  const open = useSettingsStore((s) => s.danger.deleteOpen)
  const close = useSettingsStore((s) => s.closeDelete)
  const workspaceName = useSettingsStore((s) => s.workspace.name)

  const [confirmName, setConfirmName] = useState("")
  const [twoFA, setTwoFA] = useState("")

  useEffect(() => {
    if (!open) {
      setConfirmName("")
      setTwoFA("")
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

  const nameOK = confirmName.trim() === workspaceName
  const tfaOK = twoFA.replace(/\s+/g, "").length === TWO_FA_LEN
  const canDelete = nameOK && tfaOK

  return (
    <div
      className={cn(
        "fixed inset-0 z-[300] flex items-center justify-center p-10 transition-opacity duration-200",
        "bg-black/60 backdrop-blur-md",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-ws-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "glass-strong border border-danger rounded-md max-w-[520px] w-full flex flex-col max-h-[85vh] transition-transform duration-200",
          "shadow-orage-lg",
          open ? "scale-100" : "scale-95",
        )}
      >
        <header className="px-6 pt-5 pb-3 border-b border-danger">
          <h2
            id="delete-ws-title"
            className="font-display text-[22px] tracking-[0.08em] text-danger"
          >
            DELETE WORKSPACE
          </h2>
          <p className="text-xs text-text-muted mt-1">
            This destroys every tenant artifact after a 30-day grace period · no
            recovery possible after grace ends
          </p>
        </header>
        <div className="px-6 py-5 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm-name"
              className="font-display text-[10px] tracking-[0.2em] text-danger uppercase"
            >
              Type the workspace name to confirm
            </label>
            <InputField
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspaceName}
              autoComplete="off"
            />
            <div className="text-[11px] text-text-muted italic">
              Must match exactly: <span className="font-mono">{workspaceName}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm-2fa"
              className="font-display text-[10px] tracking-[0.2em] text-danger uppercase"
            >
              2FA Code
            </label>
            <InputField
              id="confirm-2fa"
              value={twoFA}
              onChange={(e) => setTwoFA(e.target.value)}
              placeholder="123 456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              className="font-mono"
            />
            <div className="text-[11px] text-text-muted italic">
              Enter the 6-digit code from your authenticator app
            </div>
          </div>
        </div>
        <footer className="px-6 pt-3 pb-5 border-t border-danger flex justify-end gap-2">
          <SecondaryButton onClick={close}>Cancel</SecondaryButton>
          <DangerButton
            disabled={!canDelete}
            onClick={() => {
              toast("DELETION SCHEDULED · 30-DAY GRACE")
              close()
            }}
            className={cn(!canDelete && "opacity-40 cursor-not-allowed")}
          >
            Delete Workspace
          </DangerButton>
        </footer>
      </div>
    </div>
  )
}
