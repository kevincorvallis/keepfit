import { useState } from 'react'
import type { Equipment, Exercise, MuscleGroup } from '../../lib/types'
import { MUSCLE_GROUPS } from '../../lib/types'
import { Button, Sheet } from '../../app/ui'
import { db } from '../../db/db'
import { useExercises } from '../../state/hooks'
import { Chip, Segmented } from './controls'

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']

/** Pick an exercise from the catalog, or create a custom one, then add it. */
export function AddExerciseSheet({
  onAdd,
  onClose,
}: {
  onAdd: (exercise: Exercise) => void
  onClose: () => void
}) {
  const exercises = useExercises()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Equipment | 'all'>('all')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [muscles, setMuscles] = useState<MuscleGroup[]>([])

  const q = query.trim().toLowerCase()
  const filtered = exercises.filter(
    (e) =>
      (filter === 'all' || e.equipment === filter) &&
      (q === '' || e.name.toLowerCase().includes(q)),
  )

  const toggleMuscle = (m: MuscleGroup) =>
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))

  const createCustom = async () => {
    const exercise: Exercise = {
      id: `custom-${crypto.randomUUID()}`,
      name: name.trim(),
      equipment,
      primaryMuscles: muscles,
      secondaryMuscles: [],
      isCustom: true,
    }
    await db.exercises.put(exercise)
    onAdd(exercise)
  }

  return (
    <Sheet open onClose={onClose} title="Add exercise">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
        className="min-h-12 w-full rounded-card border border-line bg-raised px-4 text-base placeholder:text-faint"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </Chip>
        {EQUIPMENT.map((e) => (
          <Chip key={e} active={filter === e} onClick={() => setFilter(e)}>
            {e}
          </Chip>
        ))}
      </div>

      <ul className="mt-3">
        {filtered.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onAdd(e)}
              className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-line px-1 text-left active:bg-raised"
            >
              <span className="font-medium">{e.name}</span>
              <span className="shrink-0 text-xs text-dust">
                {e.isCustom ? 'custom' : e.equipment}
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="border-t border-line px-1 py-4 text-sm text-dust">
            No exercises match — clear the search or create one below.
          </li>
        )}
      </ul>

      <div className="mt-4 border-t border-line pt-4">
        {!creating ? (
          <Button variant="secondary" className="w-full" onClick={() => setCreating(true)}>
            Create custom exercise
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-display text-lg font-semibold uppercase">New exercise</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
              aria-label="Exercise name"
              className="min-h-12 w-full rounded-card border border-line bg-raised px-4 text-base placeholder:text-faint"
            />
            <Segmented
              label="Equipment"
              value={equipment}
              options={EQUIPMENT.map((e) => ({ value: e, label: e }))}
              onChange={setEquipment}
            />
            <div>
              <p className="mb-2 text-sm font-medium text-dust">Primary muscles</p>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((m) => (
                  <Chip key={m} active={muscles.includes(m)} onClick={() => toggleMuscle(m)}>
                    {m}
                  </Chip>
                ))}
              </div>
            </div>
            <Button
              variant="primary"
              disabled={name.trim() === '' || muscles.length === 0}
              onClick={() => void createCustom()}
            >
              Add exercise
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
