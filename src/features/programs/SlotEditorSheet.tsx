import type { Exercise, ProgramSlot, ProgressionMode, Unit } from '../../lib/types'
import { Button, Sheet } from '../../app/ui'
import { defaultProgression } from '../../lib/progression'
import { formatWeight } from '../../lib/plates'
import { Segmented, Stepper } from './controls'
import { formatRest, nextSupersetGroup } from './edits'

const MODE_OPTIONS: ReadonlyArray<{ value: ProgressionMode; label: string }> = [
  { value: 'double', label: 'Double' },
  { value: 'linear', label: 'Linear' },
  { value: 'manual', label: 'Manual' },
]

/** Edit one program slot; every change persists immediately via onChange. */
export function SlotEditorSheet({
  slot,
  exercise,
  unit,
  onChange,
  onRemove,
  onClose,
}: {
  slot: ProgramSlot
  exercise: Exercise | undefined
  unit: Unit
  onChange: (patch: Partial<Omit<ProgramSlot, 'id'>>) => void
  onRemove: () => void
  onClose: () => void
}) {
  const p = slot.progression
  const incrementStep = defaultProgression(exercise?.equipment ?? 'machine', unit).roundTo
  const setP = (patch: Partial<typeof p>) => onChange({ progression: { ...p, ...patch } })

  return (
    <Sheet open onClose={onClose} title={exercise?.name ?? 'Exercise'}>
      <div className="flex flex-col gap-1">
        <Stepper label="Sets" value={slot.sets} min={1} max={8} onChange={(sets) => onChange({ sets })} />
        <Stepper
          label="Rest"
          value={slot.restSeconds}
          min={0}
          max={300}
          step={15}
          format={formatRest}
          onChange={(restSeconds) => onChange({ restSeconds })}
        />

        <div className="mt-3">
          <p className="mb-2 text-sm font-medium text-dust">Progression</p>
          <Segmented
            label="Progression mode"
            value={p.mode}
            options={MODE_OPTIONS}
            onChange={(mode) => setP(mode === 'linear' ? { mode, maxReps: p.minReps } : { mode })}
          />
          {p.mode === 'manual' && (
            <p className="mt-2 text-sm text-faint">Manual — no automatic suggestions for this exercise.</p>
          )}
        </div>

        {p.mode === 'linear' ? (
          <Stepper
            label="Target reps"
            value={p.maxReps}
            min={1}
            max={30}
            onChange={(v) => setP({ minReps: v, maxReps: v })}
          />
        ) : (
          <>
            <Stepper
              label="Min reps"
              value={p.minReps}
              min={1}
              max={p.maxReps}
              onChange={(minReps) => setP({ minReps })}
            />
            <Stepper
              label="Max reps"
              value={p.maxReps}
              min={p.minReps}
              max={30}
              onChange={(maxReps) => setP({ maxReps })}
            />
          </>
        )}
        <Stepper
          label="Increment"
          value={p.increment}
          min={incrementStep}
          max={unit === 'kg' ? 25 : 50}
          step={incrementStep}
          format={(v) => formatWeight(v, unit)}
          onChange={(increment) => setP({ increment })}
        />
        <Stepper
          label="Target RIR"
          value={p.targetRir}
          min={0}
          max={4}
          onChange={(targetRir) => setP({ targetRir })}
        />

        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-sm font-medium text-dust">Superset group</span>
          <button
            type="button"
            onClick={() => onChange({ supersetGroup: nextSupersetGroup(slot.supersetGroup) })}
            className={`min-h-12 min-w-16 rounded-card border px-4 font-semibold transition-colors ${
              slot.supersetGroup ? 'border-plate-blue/50 text-plate-blue' : 'border-line text-dust'
            }`}
          >
            {slot.supersetGroup ?? 'None'}
          </button>
        </div>

        <Button variant="danger" className="mt-4 w-full" onClick={onRemove}>
          Remove exercise
        </Button>
      </div>
    </Sheet>
  )
}
