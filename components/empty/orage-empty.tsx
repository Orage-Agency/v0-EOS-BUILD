import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Orage-branded empty state.
 *
 * Variants:
 * - "module"  → tall, hero-style empty for full-page module views (Rocks,
 *               VTO, L10, Issues, Tasks, etc.).
 * - "panel"   → compact card empty for dashboard sub-widgets.
 * - "inline"  → minimal one-liner used inside lists (drawer panels, etc.)
 *
 * Brand notes:
 * - Big mono headline with the Orage gold accent rule on the left.
 * - Description in slate, monospace metadata up top.
 * - Optional primary + ghost CTA, both rendered with the existing gold pill
 *   styling used elsewhere in the app.
 */
type Cta = {
  label: string
  href?: string
  onClick?: () => void
  variant?: "primary" | "ghost"
  external?: boolean
}

export function OrageEmpty({
  variant = "module",
  eyebrow,
  title,
  description,
  bullets,
  ctas,
  footnote,
  className,
  children,
}: {
  variant?: "module" | "panel" | "inline"
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  bullets?: string[]
  ctas?: Cta[]
  footnote?: ReactNode
  className?: string
  children?: ReactNode
}) {
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider text-text-muted",
          className,
        )}
      >
        <span aria-hidden className="h-px w-6 bg-gold-500/40" />
        <span className="font-mono">{title}</span>
        {description ? (
          <span className="text-text-muted/70 normal-case tracking-normal">{description}</span>
        ) : null}
      </div>
    )
  }

  const isModule = variant === "module"

  return (
    <div
      className={cn(
        "relative flex flex-col items-start gap-5 overflow-hidden rounded-md border border-border-orage bg-bg-3 px-6 py-8",
        isModule && "min-h-[320px] px-8 py-12 md:min-h-[420px] md:px-12 md:py-16",
        className,
      )}
      data-slot="orage-empty"
    >
      {/* Gold accent rule */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-gold-500 via-gold-400 to-transparent",
          !isModule && "h-12",
        )}
      />
      {/* Subtle radial glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gold-500/[0.04] blur-3xl"
      />

      {eyebrow ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300">
          ◆ {eyebrow}
        </span>
      ) : null}

      <h2
        className={cn(
          "font-mono uppercase tracking-tight text-text-primary",
          isModule ? "text-2xl md:text-3xl" : "text-lg md:text-xl",
        )}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            "max-w-xl text-text-secondary leading-relaxed",
            isModule ? "text-base" : "text-sm",
          )}
        >
          {description}
        </p>
      ) : null}

      {bullets && bullets.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm text-text-secondary">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {children ? <div className="w-full">{children}</div> : null}

      {ctas && ctas.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {ctas.map((cta, i) => (
            <CtaButton key={i} cta={cta} />
          ))}
        </div>
      ) : null}

      {footnote ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          {footnote}
        </p>
      ) : null}
    </div>
  )
}

function CtaButton({ cta }: { cta: Cta }) {
  const variant = cta.variant ?? "primary"
  const cls = cn(
    "inline-flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] transition-colors",
    variant === "primary"
      ? "bg-gold-500 text-bg-1 hover:bg-gold-400"
      : "border border-border-orage text-text-primary hover:border-gold-500 hover:text-gold-300",
  )

  if (cta.href) {
    if (cta.external) {
      return (
        <a href={cta.href} target="_blank" rel="noreferrer" className={cls}>
          {cta.label} <span aria-hidden>→</span>
        </a>
      )
    }
    return (
      <Link href={cta.href} className={cls}>
        {cta.label} <span aria-hidden>→</span>
      </Link>
    )
  }

  return (
    <button type="button" onClick={cta.onClick} className={cls}>
      {cta.label} <span aria-hidden>→</span>
    </button>
  )
}
