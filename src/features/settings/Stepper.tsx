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
  const set = (raw: number) => {
    const rounded = Math.round(raw * 100) / 100
    onChange(Math.min(max, Math.max(min, rounded)))
  }
  const btn =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-line bg-raised text-chalk transition-colors select-none active:bg-line/60 disabled:opacity-40'
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => set(value - step)}
      >
        <Minus size={20} aria-hidden />
      </button>
      <span
        className={`numeral font-display text-center font-semibold ${
          big ? 'min-w-24 text-3xl' : 'min-w-8 text-xl'
        }`}
        aria-label={label}
      >
        {format ? format(value) : String(value)}
      </span>
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => set(value + step)}
      >
        <Plus size={20} aria-hidden />
      </button>
    </div>
  )
}
