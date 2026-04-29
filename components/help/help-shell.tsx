"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useEffect, useMemo, useRef, useState } from "react"
import { MANUAL, flatSections } from "@/lib/help-manual"
import { cn } from "@/lib/utils"

export function HelpShell() {
  const [query, setQuery] = useState("")
  const [activeSectionId, setActiveSectionId] = useState<string>(
    MANUAL[0]?.sections[0]?.id ?? "",
  )
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  const allSections = useMemo(() => flatSections(), [])

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return allSections.filter((s) => {
      const haystack = [
        s.title,
        s.label,
        s.lede ?? "",
        s.body,
        ...(s.bullets ?? []),
        ...(s.tags ?? []),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, allSections])

  // Scroll-spy: observe each section heading; whichever is closest to the top
  // and visible is "active" in the TOC.
  useEffect(() => {
    if (filteredSections) return
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry whose top edge is highest among intersecting ones.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          const id = visible[0].target.getAttribute("data-section-id")
          if (id) setActiveSectionId(id)
        }
      },
      {
        // Trigger when section reaches top 30% of viewport
        rootMargin: "0px 0px -65% 0px",
        threshold: [0, 0.1, 0.5, 1],
      },
    )

    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [filteredSections])

  function registerSection(id: string, el: HTMLElement | null) {
    if (el) {
      sectionRefs.current.set(id, el)
    } else {
      sectionRefs.current.delete(id)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-bg-1">
      {/* HERO */}
      <header className="border-b border-border-orage bg-bg-2">
        <div className="max-w-6xl mx-auto px-8 py-12 md:py-16">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold-400 mb-3">
            ORAGE CORE · HANDBOOK
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-text-primary tracking-tight text-balance mb-3">
            HOW THIS THING WORKS
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl text-pretty">
            The operating manual for Orage Core — the EOS-style operating system
            for the team. Search below or scroll the manual.
          </p>

          <div className="mt-6 max-w-xl">
            <label htmlFor="help-search" className="sr-only">
              Search the manual
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono"
              >
                /
              </span>
              <input
                id="help-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rocks, scorecard, l10, ai…"
                className="w-full pl-9 pr-3 py-2.5 rounded-sm border border-border-orage bg-bg-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs font-mono uppercase tracking-wider"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      {filteredSections ? (
        <SearchResults sections={filteredSections} query={query} />
      ) : (
        <ManualBody
          activeSectionId={activeSectionId}
          onSelectSection={setActiveSectionId}
          registerSection={registerSection}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Manual body with sticky TOC
// ----------------------------------------------------------------------------

function ManualBody({
  activeSectionId,
  onSelectSection,
  registerSection,
}: {
  activeSectionId: string
  onSelectSection: (id: string) => void
  registerSection: (id: string, el: HTMLElement | null) => void
}) {
  return (
    <div className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
      {/* TOC */}
      <aside className="hidden lg:block">
        <nav
          aria-label="Manual contents"
          className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto"
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted mb-3">
            CONTENTS
          </p>
          <ol className="space-y-1">
            {MANUAL.flatMap((group) =>
              group.sections.map((s) => {
                const active = activeSectionId === s.id
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={() => onSelectSection(s.id)}
                      className={cn(
                        "block py-1.5 pl-3 pr-2 -ml-px text-xs font-mono uppercase tracking-[0.1em] border-l transition-colors",
                        active
                          ? "border-gold-500 text-gold-300"
                          : "border-border-orage text-text-secondary hover:text-text-primary hover:border-text-muted",
                      )}
                    >
                      {s.label}
                    </a>
                  </li>
                )
              }),
            )}
          </ol>

          <div className="mt-6 pt-4 border-t border-border-orage">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted mb-2">
              NEED MORE?
            </p>
            <Link
              href="/ai"
              className="block text-xs text-gold-400 hover:text-gold-300 leading-relaxed"
            >
              Ask the AI Implementer →
            </Link>
            <p className="text-[10px] text-text-muted leading-relaxed mt-1">
              The chat dock is wired to this manual.
            </p>
          </div>
        </nav>
      </aside>

      {/* MANUAL */}
      <article className="min-w-0">
        {MANUAL.map((group, gi) => (
          <section key={group.id} className={cn(gi !== 0 && "mt-12")}>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold-400 mb-2">
              {group.eyebrow}
            </p>
            {group.sections.map((s, si) => (
              <SectionBlock
                key={s.id}
                section={s}
                first={gi === 0 && si === 0}
                registerSection={registerSection}
              />
            ))}
          </section>
        ))}

        <footer className="mt-16 pt-6 border-t border-border-orage flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
            END OF MANUAL
          </p>
          <Link
            href="/dashboard"
            className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-secondary hover:text-gold-300 transition-colors"
          >
            BACK TO DASHBOARD →
          </Link>
        </footer>
      </article>
    </div>
  )
}

function SectionBlock({
  section,
  first,
  registerSection,
}: {
  section: ReturnType<typeof flatSections>[number] | (typeof MANUAL)[number]["sections"][number]
  first: boolean
  registerSection: (id: string, el: HTMLElement | null) => void
}) {
  const paragraphs = section.body.split(/\n\n+/g)

  return (
    <div
      ref={(el) => registerSection(section.id, el)}
      data-section-id={section.id}
      id={section.id}
      className={cn(
        "scroll-mt-6",
        !first && "mt-8 pt-8 border-t border-border-orage/60",
      )}
    >
      <h2 className="font-display text-2xl font-bold text-text-primary tracking-tight mb-2">
        {section.title}
      </h2>
      {section.lede && (
        <p className="text-sm text-gold-300 italic leading-relaxed mb-4 text-pretty">
          {section.lede}
        </p>
      )}
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="text-sm text-text-secondary leading-relaxed mb-4 text-pretty"
        >
          {p}
        </p>
      ))}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="space-y-1.5 my-4">
          {section.bullets.map((b, i) => (
            <li
              key={i}
              className="text-sm text-text-secondary leading-relaxed pl-4 relative"
            >
              <span
                aria-hidden
                className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-gold-500"
              />
              {b}
            </li>
          ))}
        </ul>
      )}
      {section.related && section.related.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-5">
          {section.related.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="px-2.5 py-1 rounded-sm border border-border-orage text-[10px] font-mono uppercase tracking-[0.16em] text-text-secondary hover:text-gold-300 hover:border-gold-500 transition-colors"
            >
              {r.label} →
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Search results
// ----------------------------------------------------------------------------

function SearchResults({
  sections,
  query,
}: {
  sections: ReturnType<typeof flatSections>
  query: string
}) {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-muted mb-4">
        {sections.length === 0
          ? `NO RESULTS FOR "${query.toUpperCase()}"`
          : `${sections.length} RESULT${sections.length === 1 ? "" : "S"}`}
      </p>

      {sections.length === 0 ? (
        <div className="border border-border-orage rounded-sm bg-bg-3 px-5 py-8 text-center">
          <p className="text-sm text-text-secondary mb-2">
            Nothing in the manual matches that.
          </p>
          <p className="text-xs text-text-muted leading-relaxed mb-4 max-w-sm mx-auto">
            Try the AI Implementer — it has the manual loaded in context and can
            answer free-form questions.
          </p>
          <Link
            href="/ai"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-gold-500 hover:bg-gold-400 text-text-on-gold text-[11px] font-mono uppercase tracking-[0.16em] transition-colors"
          >
            Ask AI →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {sections.map((s) => (
            <li key={s.id}>
              <Link
                href={`/help#${s.id}`}
                className="block border border-border-orage rounded-sm bg-bg-3 px-5 py-4 hover:border-gold-500 transition-colors"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-gold-400 mb-1">
                  {s.groupLabel}
                </p>
                <p className="text-sm text-text-primary font-display font-bold tracking-tight">
                  {s.title}
                </p>
                {s.lede && (
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">
                    {s.lede}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
