import type { Exercise, MuscleGroup, Session } from './types'

export interface WeeklyVolume {
  /** Monday 00:00 local time of the week, epoch ms. */
  weekStart: number
  perMuscle: Partial<Record<MuscleGroup, number>>
}

/** Monday-based start of week for a timestamp, local time. */
export function weekStartOf(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

/**
 * Weekly working sets per muscle group. Primary muscles count 1.0 per set,
 * secondary 0.5. Warm-up sets are excluded. Returns weeks ascending.
 */
export function weeklyVolume(
  sessions: Session[],
  exercises: Map<string, Exercise>,
): WeeklyVolume[] {
  const weeks = new Map<number, Partial<Record<MuscleGroup, number>>>()

  for (const session of sessions) {
    const week = weekStartOf(session.startedAt)
    const bucket = weeks.get(week) ?? {}
    for (const entry of session.entries) {
      const exercise = exercises.get(entry.exerciseId)
      if (!exercise) continue
      const workingSets = entry.sets.filter((s) => !s.isWarmup).length
      if (workingSets === 0) continue
      for (const m of exercise.primaryMuscles) {
        bucket[m] = (bucket[m] ?? 0) + workingSets
      }
      for (const m of exercise.secondaryMuscles) {
        bucket[m] = (bucket[m] ?? 0) + workingSets * 0.5
      }
    }
    weeks.set(week, bucket)
  }

  return [...weeks.entries()]
    .map(([weekStart, perMuscle]) => ({ weekStart, perMuscle }))
    .sort((a, b) => a.weekStart - b.weekStart)
}
