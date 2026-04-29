"use client"

import type { ApprovalCardBlock } from "@/lib/ai-implementer-store"
import { useAIImplementerStore } from "@/lib/ai-implementer-store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function ApprovalCard({ block }: { block: ApprovalCardBlock }) {
  const approve = useAIImplementerStore((s) => s.approveCard)
  const reject = useAIImplementerStore((s) => s.rejectCard)
  const isPending = block.state === "pending"

  return (
    <div
      className={cn(
        "my-3 border-l-2 border-warning bg-[rgba(212,162,74,0.05)] rounded-sm overflow-hidden transition",
        !isPending && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-warning/30 bg-[rgba(212,162,74,0.08)]">
        <span className="w-4 h-4 rounded-full bg-warning text-[var(--bg-1)] text-[10px] font-bold flex items-center justify-center">
          !
        </span>
        <span className="font-display tracking-[0.2em] text-[10px] text-warning">
          APPROVAL REQUIRED · {block.category}
        </span>
        {block.state === "approved" && (
          <span className="ml-auto font-display tracking-[0.18em] text-[9px] px-1.5 py-px rounded-sm bg-[rgba(111,170,107,0.18)] text-success">
            APPROVED
          </span>
        )}
        {block.state === "rejected" && (
          <span className="ml-auto font-display tracking-[0.18em] text-[9px] px-1.5 py-px rounded-sm bg-[rgba(194,84,80,0.18)] text-danger">
            REJECTED
          </span>
        )}
      </div>
      <div className="px-3 py-3">
        <div className="text-text-primary text-sm font-medium mb-3">
          {block.action}
        </div>
        <dl className="space-y-2 mb-3">
          {block.fields.map((field) => (
            <div key={field.label} className="flex gap-3">
              <dt className="font-display tracking-[0.18em] text-[9px] text-text-dim shrink-0 w-16 pt-0.5">
                {field.label}
              </dt>
              <dd className="text-[12px] text-text-secondary leading-snug">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              approve(block.id)
              toast("APPROVED · ACTION EXECUTED")
            }}
            className="font-display tracking-[0.18em] text-[10px] px-3 py-1.5 rounded-sm bg-gold-500 hover:bg-gold-400 text-text-on-gold transition"
          >
            APPROVE
          </button>
          <button
            onClick={() => toast("MODIFY MODE")}
            className="font-display tracking-[0.18em] text-[10px] px-3 py-1.5 rounded-sm border border-border-orage text-text-secondary hover:bg-bg-3 transition"
          >
            MODIFY FIRST
          </button>
          <button
            onClick={() => {
              reject(block.id)
              toast("REJECTED · LOGGED")
            }}
            className="font-display tracking-[0.18em] text-[10px] px-3 py-1.5 rounded-sm border border-border-orage text-text-muted hover:text-danger hover:border-danger/60 transition"
          >
            REJECT
          </button>
        </div>
      </div>
    </div>
  )
}
