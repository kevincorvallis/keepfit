import { useMemo, useState } from 'react'
import { Sheet } from '../../app/ui'
import type { Equipment, Exercise } from '../../lib/types'

const EQUIPMENT_ORDER: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
}

/** Mid-session exercise picker: search the catalog, grouped by equipment. */
export function AddExerciseSheet({
  exercises,
  onPick,
  onClose,
}: {
  exercises: Exercise[]
  onPick: (exerciseId: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? exercises.filter((e) => e.name.toLowerCase().includes(needle))
      : exercises
    return EQUIPMENT_ORDER.map((equipment) => ({
      equipment,
      items: filtered.filter((e) => e.equipment === equipment),
    })).filter((g) => g.items.length > 0)
  }, [exercises, query])

  return (
    <Sheet open onClose={onClose} title="Add exercise">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
        autoFocus
        className="h-12 w-full rounded-lg border border-line bg-raised px-3 text-base placeholder:text-faint"
      />
      {groups.length === 0 && (
        <p className="mt-4 text-sm text-dust">
          No exercises match that search. Clear it to see the full catalog.
        </p>
      )}
      {groups.map(({ equipment, items }) => (
        <div key={equipment} className="mt-4">
          <p className="font-display text-xs font-semibold tracking-[0.14em] text-faint uppercase">
            {EQUIPMENT_LABELS[equipment]}
          </p>
          <div className="mt-1 divide-y divide-line/50">
            {items.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onPick(exercise.id)}
                className="flex min-h-12 w-full items-center justify-between gap-3 text-left active:bg-raised"
              >
                <span className="min-w-0 truncate">{exercise.name}</span>
                <span className="shrink-0 text-xs text-dust">
                  {exercise.primaryMuscles.join(', ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  )
}
