import type { Exercise, Session, Unit } from '../../lib/types'
import { formatWeight } from '../../lib/plates'
import { bestSetFor, mostTrainedExercises, shortDate } from './trainingData'

/** Current best e1RM for the six most-trained exercises, with the set behind it. */
export function PrList({
  sessions,
  exercises,
  unit,
}: {
  sessions: Session[]
  exercises: Map<string, Exercise>
  unit: Unit
}) {
  const rows = mostTrainedExercises(sessions, exercises, 6)
    .map((id) => ({ id, best: bestSetFor(sessions, id) }))
    .filter((r): r is { id: string; best: NonNullable<typeof r.best> } => r.best !== undefined)

  if (rows.length === 0) return null

  return (
    <section>
      <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-faint uppercase">
        Personal records
      </h2>
      <ul className="mt-3 divide-y divide-line/60 rounded-card border border-line bg-surface">
        {rows.map(({ id, best }) => (
          <li key={id} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{exercises.get(id)?.name ?? 'Unknown exercise'}</p>
              <p className="numeral mt-0.5 text-xs text-faint">
                {formatWeight(best.weight, unit)} × {best.reps} · {shortDate(best.date)}
              </p>
            </div>
            <p className="numeral font-display shrink-0 text-2xl font-semibold">
              {Math.round(best.e1rm)}
              <span className="ml-1 text-sm font-medium text-dust">{unit}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
