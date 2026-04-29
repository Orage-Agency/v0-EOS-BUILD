import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Shared section primitives used across every settings sub-route.
 * Mirrors the .section-block / .s-card / .field-row classes in the prototype.
 */

export function SectionBlock({
  title,
  description,
  titleClassName,
  children,
}: {
  title: string
  description?: string
  titleClassName?: string
  children: ReactNode
}) {
  return (
    <section className="mb-9 last:mb-0">
      <h2
        className={cn(
          "font-display text-[24px] tracking-[0.06em] text-gold-400 mb-1.5 leading-none",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="text-xs text-text-muted mb-5 leading-relaxed">
          {description}
        </p>
      ) : null}
      {children}
    </section>
  )
}

export function SCard({
  title,
  action,
  children,
  variant = "default",
  bodyClassName,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  variant?: "default" | "master" | "danger"
  bodyClassName?: string
}) {
  return (
    <div
      className={cn(
        "rounded-md overflow-hidden mb-3.5 border",
        variant === "master" &&
          "border-gold-500 bg-gradient-to-br from-[rgba(182,128,57,0.06)] to-[rgba(228,175,122,0.02)]",
        variant === "danger" && "border-danger bg-[rgba(194,84,80,0.05)]",
        variant === "default" && "border-border-orage bg-bg-3",
      )}
    >
      {title ? (
        <header
          className={cn(
            "px-[18px] py-3.5 flex items-center justify-between border-b",
            variant === "master" &&
              "bg-[rgba(182,128,57,0.08)] border-gold-500",
            variant === "danger" &&
              "bg-[rgba(194,84,80,0.1)] border-danger",
            variant === "default" && "bg-bg-2 border-border-orage",
          )}
        >
          <h3
            className={cn(
              "font-display text-[13px] tracking-[0.18em] uppercase",
              variant === "danger" ? "text-danger" : "text-gold-400",
            )}
          >
            {title}
          </h3>
          {action}
        </header>
      ) : null}
      <div className={cn("p-[18px]", bodyClassName)}>{children}</div>
    </div>
  )
}

export function FieldRow({
  name,
  hint,
  control,
  full,
}: {
  name?: string
  hint?: string
  control: ReactNode
  full?: boolean
}) {
  if (full) {
    return (
      <div className="py-3.5 border-b border-border-orage last:border-b-0">
        {control}
      </div>
    )
  }
  return (
    <div
      className="grid items-start gap-[18px] py-3.5 border-b border-border-orage last:border-b-0"
      style={{ gridTemplateColumns: "200px 1fr" }}
    >
      <div className="pt-1.5">
        {name ? (
          <div className="text-[13px] text-text-primary font-medium mb-1 leading-tight">
            {name}
          </div>
        ) : null}
        {hint ? (
          <div className="text-[11px] text-text-muted leading-relaxed">
            {hint}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">{control}</div>
    </div>
  )
}

export function InputField(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={cn(
        "bg-bg-2 border border-border-orage rounded-sm px-3 py-2 text-[13px] text-text-primary w-full transition-colors focus:border-gold-500 focus:bg-bg-3 focus:outline-none",
        props.className,
      )}
    />
  )
}

export function TextareaField(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(
        "bg-bg-2 border border-border-orage rounded-sm px-3 py-2 text-[13px] text-text-primary w-full min-h-[70px] resize-y leading-relaxed transition-colors focus:border-gold-500 focus:bg-bg-3 focus:outline-none",
        props.className,
      )}
    />
  )
}

export function SelectField(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={cn(
        "bg-bg-2 border border-border-orage rounded-sm px-3 py-2 text-[13px] text-text-primary w-full cursor-pointer transition-colors focus:border-gold-500 focus:bg-bg-3 focus:outline-none",
        props.className,
      )}
    />
  )
}

export function PrimaryButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "px-4 py-2 rounded-sm text-xs font-semibold text-text-on-gold inline-flex items-center gap-1.5 transition-all hover:-translate-y-px",
        "shadow-[0_2px_8px_rgba(182,128,57,0.3)] hover:shadow-[0_4px_14px_rgba(182,128,57,0.4)]",
        "bg-gradient-to-br from-gold-500 to-gold-400",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "px-3.5 py-1.5 bg-bg-2 text-text-primary border border-border-orage rounded-sm text-xs transition-colors hover:bg-bg-4 hover:border-gold-500",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function DangerButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "px-3.5 py-1.5 bg-transparent text-danger border border-danger rounded-sm text-xs font-medium transition-colors hover:bg-[rgba(194,84,80,0.1)]",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function FormFooter({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end gap-2 mt-3.5">
      <SecondaryButton>Discard</SecondaryButton>
      <PrimaryButton onClick={onSave}>Save Changes</PrimaryButton>
    </div>
  )
}
