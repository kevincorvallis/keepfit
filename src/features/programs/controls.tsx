import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button, Sheet } from '../../app/ui'

/** Labeled ± stepper row with 48px touch targets. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  // Optimistic local value so rapid taps never compute from a stale,
  // liveQuery-lagged prop and silently drop increments.
  const [local, setLocal] = useState(value)
  useEffect(() => {
    setLocal(value)
  }, [value])

  const nudge = (dir: 1 | -1) => {
    const raw = Math.round((local + dir * step) * 1000) / 1000
    const next = Math.min(max, Math.max(min, raw))
    setLocal(next)
    onChange(next)
  }
  const formatted = format ? format(local) : String(local)
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm font-medium text-dust">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={local <= min}
          onClick={() => nudge(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-card border border-line bg-raised text-chalk active:bg-line/60 disabled:opacity-40"
        >
          <Minus size={18} aria-hidden />
        </button>
        {/* Live readout so screen readers hear each new value after a tap. */}
        <span
          role="status"
          aria-label={`${label} ${formatted}`}
          className="numeral font-display min-w-16 px-1 text-center text-2xl font-semibold"
        >
          {formatted}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={local >= max}
          onClick={() => nudge(1)}
          className="flex h-12 w-12 items-center justify-center rounded-card border border-line bg-raised text-chalk active:bg-line/60 disabled:opacity-40"
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/** Segmented control — one active option, equal-width segments. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-card border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-12 flex-1 px-1 text-sm font-medium transition-colors ${
            o.value === value ? 'bg-raised text-chalk' : 'text-dust'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Pill toggle chip, 48px tall. */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-12 rounded-full border px-4 text-sm font-medium transition-colors ${
        active ? 'border-chalk bg-raised text-chalk' : 'border-line text-dust'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Tap-to-edit text that renders as the surrounding typography, with a
 * dashed underline as the edit affordance. Saves on blur or Enter; Escape
 * reverts to the original value; an emptied value reverts unless allowEmpty.
 */
export function InlineText({
  value,
  onSave,
  label,
  className = '',
  placeholder,
  allowEmpty = false,
}: {
  value: string
  onSave: (v: string) => void
  label: string
  className?: string
  placeholder?: string
  allowEmpty?: boolean
}) {
  return (
    <input
      key={value}
      defaultValue={value}
      aria-label={label}
      placeholder={placeholder}
      className={`w-full min-w-0 rounded-sm border-b border-dashed border-line/70 bg-transparent placeholder:text-faint focus:border-dust ${className}`}
      onBlur={(e) => {
        const next = e.currentTarget.value.trim()
        if (next === value) return
        if (next === '' && !allowEmpty) {
          e.currentTarget.value = value
          return
        }
        onSave(next)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          // Cancel the edit: restore the saved value, then leave the field.
          e.currentTarget.value = value
          e.currentTarget.blur()
        }
      }}
    />
  )
}

/** Destructive-action confirmation in the app's one modal surface. */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-sm text-dust">{body}</p>
      <div className="mt-5 flex flex-col gap-2">
        <Button variant="danger" big onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" big onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  )
}
