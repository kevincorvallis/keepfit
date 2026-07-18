import type { HistoryPoint, Session } from './types'

/**
 * Extract an exercise's working-set history from finished sessions,
 * ascending by date — the shape the progression engine consumes.
 * Warm-up sets are excluded here so they can never pollute progression.
 */
export function historyForExercise(sessions: Session[], exerciseId: string): HistoryPoint[] {
  const points: HistoryPoint[] = []
  for (const session of sessions) {
    if (session.finishedAt === undefined) continue
    const sets = session.entries
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
      .filter((s) => !s.isWarmup && s.reps > 0)
      .map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir }))
    if (sets.length > 0) points.push({ date: session.startedAt, sets })
  }
  return points.sort((a, b) => a.date - b.date)
}
