import type { Exercise, Session } from '../../lib/types'
import { epley } from '../../lib/e1rm'
import { historyForExercise } from '../../lib/history'

/** Number of finished sessions in which each exercise has working sets. */
export function sessionCountByExercise(sessions: Session[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    if (session.finishedAt === undefined) continue
    const seen = new Set<string>()
    for (const entry of session.entries) {
      if (entry.sets.some((s) => !s.isWarmup && s.reps > 0)) seen.add(entry.exerciseId)
    }
    for (const id of seen) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** The `limit` most-trained exercise ids, by session count then name. */
export function mostTrainedExercises(
  sessions: Session[],
  exercises: Map<string, Exercise>,
  limit: number,
): string[] {
  return [...sessionCountByExercise(sessions).entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        (exercises.get(a[0])?.name ?? a[0]).localeCompare(exercises.get(b[0])?.name ?? b[0]),
    )
    .slice(0, limit)
    .map(([id]) => id)
}

export interface BestSet {
  e1rm: number
  weight: number
  reps: number
  date: number
}

/** The working set with the highest e1RM ever logged for an exercise. */
export function bestSetFor(sessions: Session[], exerciseId: string): BestSet | undefined {
  let best: BestSet | undefined
  for (const point of historyForExercise(sessions, exerciseId)) {
    for (const set of point.sets) {
      const e1rm = epley(set.weight, set.reps)
      if (e1rm > 0 && (best === undefined || e1rm > best.e1rm)) {
        best = { e1rm, weight: set.weight, reps: set.reps, date: point.date }
      }
    }
  }
  return best
}

export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
