"use client"

import { useEffect, useState } from "react"
import { usePeopleStore, userById } from "@/lib/people-store"
import { IcClose } from "@/components/orage/icons"
import { toast } from "sonner"

function defaultDateStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function ScheduleModal() {
  const personId = usePeopleStore((s) => s.scheduleOpenForPersonId)
  const close = () =>
    usePeopleStore.setState({ scheduleOpenForPersonId: null })
  const schedule = usePeopleStore((s) => s.scheduleOneOnOne)
  const open = usePeopleStore((s) => s.openOneOnOneDrawer)

  const [date, setDate] = useState(defaultDateStr())
  const [time, setTime] = useState("10:00")
  const [duration, setDuration] = useState(30)

  useEffect(() => {
    if (!personId) return
    setDate(defaultDateStr())
    setTime("10:00")
    setDuration(30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  if (!personId) return null
  const target = userById(personId)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!personId) return
    const ts = new Date(`${date}T${time}`).getTime()
    if (Number.isNaN(ts)) {
      toast("INVALID DATE")
      return
    }
    const id = schedule(personId, ts, duration)
    close()
    toast("1:1 SCHEDULED", {
      description: `${target?.name.split(" ")[0] ?? ""} · ${date} ${time}`,
    })
    open(id)
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 fade-in"
        onClick={close}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Schedule 1:1"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <form
          onSubmit={onSubmit}
          className="bg-bg-2 border border-border-orage rounded-md w-full max-w-md shadow-2xl pointer-events-auto"
        >
          <header className="flex items-center justify-between px-5 h-[52px] border-b border-border-orage">
            <h2 className="font-display text-text-primary text-base tracking-[0.1em] uppercase">
              Schedule 1:1
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="w-8 h-8 rounded-sm hover:bg-bg-hover flex items-center justify-center text-text-muted"
            >
              <IcClose className="w-4 h-4" />
            </button>
          </header>

          <div className="px-5 py-5 flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              With{" "}
              <span className="text-text-primary font-medium">
                {target?.name}
              </span>
            </p>

            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 w-full bg-bg-3 border border-border-orage rounded-sm px-3 text-sm text-text-primary focus:border-gold-500 focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Time">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="h-9 w-full bg-bg-3 border border-border-orage rounded-sm px-3 text-sm text-text-primary focus:border-gold-500 focus:outline-none"
                />
              </Field>
              <Field label="Duration">
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-9 w-full bg-bg-3 border border-border-orage rounded-sm px-3 text-sm text-text-primary focus:border-gold-500 focus:outline-none"
                >
                  {[15, 30, 45, 60, 90].map((n) => (
                    <option key={n} value={n}>
                      {n} min
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <footer className="border-t border-border-orage px-5 py-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="h-9 px-4 bg-bg-3 border border-border-orage hover:bg-bg-hover text-text-secondary text-xs font-semibold tracking-wider uppercase rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-4 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm"
            >
              Schedule
            </button>
          </footer>
        </form>
      </div>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
