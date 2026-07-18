import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { PlateBar } from '../../app/PlateBar'
import { formatWeight } from '../../lib/plates'
import type { WarmupSet } from '../../lib/warmup'
import type { LoggedSet, Unit } from '../../lib/types'

/**
 * Collapsed ramp toward the working weight. Each row is a compact ticket
 * with its own plate loadout and a single tap-to-log circle. Tapping a
 * logged circle undoes it.
 */
export function WarmupSection({
  plan,
  loggedWarmups,
  unit,
  barbell,
  barWeight,
  plates,
  onLog,
  onUndo,
}: {
  plan: WarmupSet[]
  loggedWarmups: LoggedSet[]
  unit: Unit
  /** Only barbell rows render a plate loadout. */
  barbell: boolean
  barWeight: number
  plates: number[]
  onLog: (weight: number, reps: number) => void
  onUndo: (set: LoggedSet) => void
}) {
  const [open, setOpen] = useState(false)

  // Match logged warm-ups to plan rows by weight, consuming each logged set
  // at most once — never by array position, so skipping the empty bar and
  // tapping a later row lights (and undoes) exactly that row.
  const claimed = new Set<string>()
  const rowLogged = plan.map((w) => {
    const match = loggedWarmups.find(
      (s) => !claimed.has(s.id) && Math.abs(s.weight - w.weight) < 1e-9,
    )
    if (match) claimed.add(match.id)
    return match
  })
  const done = rowLogged.filter((s) => s !== undefined).length

  return (
    <div className="mt-3 rounded-lg border border-line/70 bg-ink/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between px-3 text-left"
      >
        <span className="font-display text-sm font-semibold tracking-wide text-dust uppercase">
          Warm-up · {done > 0 ? `${done}/${plan.length}` : `${plan.length} sets`}
        </span>
        <ChevronDown size={18} className={`text-faint ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="space-y-1 px-3 pb-3">
          {plan.map((w, i) => {
            const logged = rowLogged[i]
            return (
              <div key={`${w.weight}-${i}`} className="flex items-center gap-3">
                <span className="numeral w-16 shrink-0 text-lg">{formatWeight(w.weight, unit)}</span>
                <span className="numeral w-8 shrink-0 text-sm text-dust">×{w.reps}</span>
                <div className="min-w-0 flex-1">
                  {barbell && (
                    <PlateBar
                      compact
                      targetWeight={w.weight}
                      barWeight={barWeight}
                      plates={plates}
                      unit={unit}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => (logged ? onUndo(logged) : onLog(w.weight, w.reps))}
                  aria-label={
                    logged
                      ? `Undo warm-up ${formatWeight(w.weight, unit)} × ${w.reps}`
                      : `Log warm-up ${formatWeight(w.weight, unit)} × ${w.reps}`
                  }
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 select-none ${
                    logged
                      ? 'border-plate-green bg-plate-green/15 text-plate-green'
                      : 'border-line bg-raised text-faint active:border-chalk active:text-chalk'
                  }`}
                >
                  <Check size={20} aria-hidden />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
