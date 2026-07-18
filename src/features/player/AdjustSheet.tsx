import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button, Sheet } from '../../app/ui'
import { roundToStep } from '../../lib/plates'
import type { Unit } from '../../lib/types'

const RIR_OPTIONS: Array<number | undefined> = [undefined, 0, 1, 2, 3, 4]

function formatNum(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : '0'
}

/**
 * Adjust-and-log sheet for one working set: big steppers, an RIR strip,
 * and Log / Save / Delete depending on whether the set is already logged.
 */
export function AdjustSheet({
  title,
  unit,
  weightStep,
  initialWeight,
  initialReps,
  initialRir,
  logged,
  onClose,
  onLog,
  onSave,
  onDelete,
}: {
  title: string
  unit: Unit
  weightStep: number
  initialWeight: number
  initialReps: number
  initialRir?: number
  logged: boolean
  onClose: () => void
  onLog: (weight: number, reps: number, rir?: number) => void
  onSave: (weight: number, reps: number, rir?: number) => void
  onDelete: () => void
}) {
  const [weightStr, setWeightStr] = useState(() => formatNum(initialWeight))
  const [reps, setReps] = useState(Math.max(1, initialReps))
  const [rir, setRir] = useState<number | undefined>(initialRir)

  const weight = Number.parseFloat(weightStr)
  const valid = Number.isFinite(weight) && weight >= 0 && reps >= 1

  function stepWeight(dir: 1 | -1) {
    const current = Number.isFinite(weight) ? weight : 0
    const next = Math.max(0, roundToStep(current + dir * weightStep, weightStep))
    setWeightStr(formatNum(next))
  }

  const stepperButton =
    'flex h-14 w-16 shrink-0 items-center justify-center rounded-card border border-line bg-raised text-chalk select-none active:bg-line/60'

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-6">
        <div>
          <p className="font-display text-xs font-semibold tracking-wide text-dust uppercase">
            Weight ({unit})
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className={stepperButton}
              onClick={() => stepWeight(-1)}
              aria-label={`Decrease weight by ${weightStep} ${unit}`}
            >
              <Minus size={22} aria-hidden />
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              aria-label={`Weight in ${unit}`}
              className="numeral font-display h-14 min-w-0 flex-1 rounded-lg bg-transparent text-center text-5xl font-bold"
            />
            <button
              type="button"
              className={stepperButton}
              onClick={() => stepWeight(1)}
              aria-label={`Increase weight by ${weightStep} ${unit}`}
            >
              <Plus size={22} aria-hidden />
            </button>
          </div>
        </div>

        <div>
          <p className="font-display text-xs font-semibold tracking-wide text-dust uppercase">
            Reps
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className={stepperButton}
              onClick={() => setReps((r) => Math.max(1, r - 1))}
              aria-label="Decrease reps"
            >
              <Minus size={22} aria-hidden />
            </button>
            <span className="numeral font-display min-w-0 flex-1 text-center text-5xl font-bold">
              {reps}
            </span>
            <button
              type="button"
              className={stepperButton}
              onClick={() => setReps((r) => Math.min(99, r + 1))}
              aria-label="Increase reps"
            >
              <Plus size={22} aria-hidden />
            </button>
          </div>
        </div>

        <div>
          <p className="font-display text-xs font-semibold tracking-wide text-dust uppercase">
            RIR
          </p>
          <div className="mt-2 flex gap-2">
            {RIR_OPTIONS.map((option) => {
              const selected = rir === option
              return (
                <button
                  key={option ?? 'none'}
                  type="button"
                  onClick={() => setRir(option)}
                  aria-label={option === undefined ? 'No RIR' : `RIR ${option}`}
                  aria-pressed={selected}
                  className={`numeral min-h-12 flex-1 rounded-lg border text-lg font-semibold select-none ${
                    selected
                      ? 'border-chalk bg-raised text-chalk'
                      : 'border-line text-dust active:text-chalk'
                  }`}
                >
                  {option ?? '–'}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-sm text-dust">How many reps were left in the tank?</p>
        </div>

        {logged ? (
          <div className="space-y-2">
            <Button variant="primary" big disabled={!valid} onClick={() => onSave(weight, reps, rir)}>
              Save changes
            </Button>
            <Button variant="danger" className="w-full" onClick={onDelete}>
              Delete set
            </Button>
          </div>
        ) : (
          <Button variant="primary" big disabled={!valid} onClick={() => onLog(weight, reps, rir)}>
            Log set
          </Button>
        )}
      </div>
    </Sheet>
  )
}
