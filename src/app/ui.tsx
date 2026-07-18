import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-plate-red text-chalk active:brightness-110',
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

/** Bottom sheet — the app's only modal surface. */
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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-lg flex-col justify-end" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/70" onClick={onClose} />
      <div className="relative max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
        <h2 className="font-display mb-4 text-2xl font-bold uppercase">{title}</h2>
        {children}
      </div>
    </div>
  )
}
