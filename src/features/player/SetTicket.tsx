import { useState } from 'react'
import { Check } from 'lucide-react'
import type { LoggedSet, Unit } from '../../lib/types'

/**
 * One working-set "ticket". The sacred rule: when the prefill is right,
 * logging is ONE tap on the big circle. Tapping the rest of the row opens
 * the adjust sheet.
 */
export function SetTicket({
  setNumber,
  exerciseLabel,
  logged,
  pr,
  weight,
  reps,
  unit,
  bodyweight,
  weightInput,
  onLog,
  onOpen,
}: {
  setNumber: number
  /** Shown above the numerals inside superset blocks. */
  exerciseLabel?: string
  logged?: LoggedSet
  pr: boolean
  weight: number
  reps: number
  unit: Unit
  bodyweight: boolean
  /** No usable prefill yet — show an inline weight input on this row. */
  weightInput: boolean
  onLog: (weight: number, reps: number) => void
  onOpen: (draftWeight?: number) => void
}) {
  const [draft, setDraft] = useState('')
  const draftWeight = Number.parseFloat(draft)
  const draftValid = Number.isFinite(draftWeight) && draftWeight > 0
  const displayWeight = logged ? logged.weight : weight
  const displayReps = logged ? logged.reps : reps
  const canLog = !logged && (weightInput ? draftValid : bodyweight || weight > 0)

  function handleCircle() {
    if (logged) {
      onOpen()
      return
    }
    if (weightInput) {
      if (draftValid) onLog(draftWeight, reps)
      return
    }
    if (canLog) onLog(weight, reps)
  }

  const numerals =
    !logged && !weightInput && !bodyweight && weight === 0 ? (
      <span className="text-2xl text-faint">—</span>
    ) : (
      <span className="flex items-baseline gap-1.5">
        {bodyweight && displayWeight === 0 ? (
          <span className="font-display text-xl font-semibold text-dust">bw</span>
        ) : (
          <>
            <span className="numeral text-2xl font-semibold">{displayWeight}</span>
            <span className="text-xs text-dust">{unit}</span>
          </>
        )}
        <span className="text-faint">×</span>
        <span className="numeral text-2xl font-semibold">{displayReps}</span>
        {pr && (
          <span className="font-display ml-1 text-sm font-bold tracking-wide text-plate-red uppercase">
            PR
          </span>
        )}
      </span>
    )

  const rirChip = (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
        logged?.rir !== undefined ? 'border-line text-chalk' : 'border-line/70 text-faint'
      }`}
    >
      {logged?.rir !== undefined ? `RIR ${logged.rir}` : 'RIR'}
    </span>
  )

  return (
    <div className="relative flex min-h-16 items-center gap-2 py-1">
      {logged && (
        <span
          aria-hidden
          className="absolute top-3 bottom-3 -left-4 w-1 rounded-r-full bg-plate-green"
        />
      )}
      {weightInput ? (
        <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3">
          <span className="numeral w-5 shrink-0 text-sm text-faint">{setNumber}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            {exerciseLabel && <span className="truncate text-xs text-dust">{exerciseLabel}</span>}
            <span className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="0"
                aria-label={`Set ${setNumber} weight in ${unit}`}
                className="numeral h-12 w-24 rounded-lg border border-line bg-raised px-2 text-center text-xl placeholder:text-faint"
              />
              <span className="text-xs text-dust">{unit}</span>
              <button
                type="button"
                onClick={() => onOpen(draftValid ? draftWeight : undefined)}
                aria-label={`Adjust set ${setNumber}`}
                className="flex min-h-12 items-center gap-2 pr-2"
              >
                <span className="text-faint">×</span>
                <span className="numeral text-2xl font-semibold">{reps}</span>
              </button>
            </span>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen()}
          aria-label={`Adjust set ${setNumber}${exerciseLabel ? ` — ${exerciseLabel}` : ''}`}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="numeral w-5 shrink-0 text-sm text-faint">{setNumber}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            {exerciseLabel && <span className="truncate text-xs text-dust">{exerciseLabel}</span>}
            {numerals}
          </span>
          <span className="ml-auto">{rirChip}</span>
        </button>
      )}
      <button
        type="button"
        onClick={handleCircle}
        disabled={!logged && !canLog}
        aria-label={
          logged
            ? `Set ${setNumber} logged — tap to adjust`
            : `Log set ${setNumber}: ${weightInput ? draft || '0' : displayWeight} ${unit} × ${displayReps}`
        }
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-colors select-none disabled:opacity-40 ${
          logged
            ? 'border-plate-green bg-plate-green/15 text-plate-green'
            : 'border-line bg-raised text-faint active:border-chalk active:text-chalk'
        }`}
      >
        <Check size={24} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}
