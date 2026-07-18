import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

/** Numeric stepper with 48px touch targets and a scoreboard numeral readout. */
export function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  label,
  format,
  big = false,
}: {
  value: number
  onChange: (next: number) => void
  step: number
  min: number
  max: number
  /** Accessible name for the value being stepped, e.g. "bar weight". */
  label: string
  format?: (value: number) => string
  big?: boolean
}) {
  // Optimistic local value: rapid taps compute from the latest tap, not the
  // liveQuery-lagged prop, so fast tapping never drops increments. The prop
  // syncs back in when it changes externally (e.g. a unit switch).
  const [local, setLocal] = useState(value)
  useEffect(() => {
    setLocal(value)
  }, [value])

  const set = (raw: number) => {
    const rounded = Math.round(raw * 100) / 100
    const next = Math.min(max, Math.max(min, rounded))
    setLocal(next)
    onChange(next)
  }
  const formatted = format ? format(local) : String(local)
  const btn =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-line bg-raised text-chalk transition-colors select-none active:bg-line/60 disabled:opacity-40'
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={local <= min}
        onClick={() => set(local - step)}
      >
        <Minus size={20} aria-hidden />
      </button>
      {/* Live readout so screen readers hear each new value after a tap. */}
      <span
        role="status"
        aria-label={`${label} ${formatted}`}
        className={`numeral font-display text-center font-semibold ${
          big ? 'min-w-24 text-3xl' : 'min-w-8 text-xl'
        }`}
      >
        {formatted}
      </span>
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        disabled={local >= max}
        onClick={() => set(local + step)}
      >
        <Plus size={20} aria-hidden />
      </button>
    </div>
  )
}
