import type { ReactNode } from 'react'

/** A settings section: card surface, condensed uppercase label, optional caption. */
export function SectionCard({
  label,
  caption,
  children,
}: {
  label: string
  caption?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-dust uppercase">
        {label}
      </h2>
      {caption && <p className="mt-1 text-sm text-faint">{caption}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
