"use client"

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
  type Ref,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createTask } from "@/app/actions/tasks"
import { useTasksStore } from "@/lib/tasks-store"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"

export type QuickAddHandle = { focus: () => void }

export const QuickAddRow = forwardRef(function QuickAddRow(
  _props,
  ref: Ref<QuickAddHandle>,
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const insert = useTasksStore((s) => s.insertTask)
  const workspaceSlug = useWorkspaceSlug()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current?.focus()
    },
  }))

  function submit() {
    const v = value.trim()
    if (!v || pending) return
    setValue("")
    startTransition(async () => {
      const res = await createTask(workspaceSlug, { title: v })
      if (!res.ok) {
        toast.error(`Could not save task — ${res.error}`)
        // Restore the typed value so the user can retry.
        setValue(v)
        return
      }
      // Optimistic insert into the local store; server is the source of
      // truth and `router.refresh()` reasserts it.
      insert(res.task)
      toast("TASK CREATED")
      router.refresh()
    })
  }

  return (
    <div
      className="grid items-center gap-3.5 px-[18px] py-2.5 border-t border-border-orage bg-bg-2"
      style={{
        gridTemplateColumns:
          "30px 24px minmax(0,1fr) 130px 100px 110px 60px 40px",
      }}
    >
      <div />
      <div />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
        }}
        placeholder={
          pending
            ? "Saving…"
            : "+ Type a new task and press Enter…"
        }
        disabled={pending}
        className="bg-transparent border-none text-text-primary text-[13px] w-full focus:outline-none placeholder:text-text-dim disabled:opacity-60"
      />
    </div>
  )
})
