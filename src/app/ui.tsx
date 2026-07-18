import { useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  // Filled CTAs use the darker action red: chalk on plate-red is only
  // 3.5:1, below AA for these label sizes.
  primary: 'bg-plate-red-action text-chalk active:brightness-110',
  secondary: 'bg-raised text-chalk border border-line active:bg-line/60',
  ghost: 'bg-transparent text-dust active:text-chalk',
  danger: 'bg-transparent text-plate-red border border-plate-red/40 active:bg-plate-red/10',
}

export function Button({
  variant = 'secondary',
  big = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; big?: boolean }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-card font-semibold transition-colors select-none disabled:opacity-40 ${
        big ? 'min-h-16 w-full text-lg' : 'min-h-12 px-4 text-base'
      } ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-6 pb-4">
      <div>
        {sub && (
          <p className="font-display text-sm font-semibold tracking-[0.14em] text-dust uppercase">{sub}</p>
        )}
        <h1 className="font-display text-4xl font-bold tracking-tight uppercase">{title}</h1>
      </div>
      {action}
    </header>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mx-5 my-10 rounded-card border border-dashed border-line p-8 text-center">
      <p className="font-display text-xl font-semibold uppercase">{title}</p>
      <p className="mt-2 text-sm text-dust">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet — the app's only modal surface. Manages focus like a real
 * dialog: focus moves into the panel on open, Tab is trapped inside,
 * Escape closes, focus returns to the trigger on close, and the page
 * behind is scroll-locked.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    // Respect autoFocus inside the sheet; otherwise focus the panel itself.
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      restoreRef.current?.focus()
    }
  }, [open])

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusables.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-30 mx-auto flex max-w-lg flex-col justify-end"
      role="dialog"
      aria-modal
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      <div aria-hidden className="absolute inset-0 bg-ink/70" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
        <h2 className="font-display mb-4 text-2xl font-bold uppercase">{title}</h2>
        {children}
      </div>
    </div>
  )
}
