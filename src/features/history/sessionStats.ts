import type { Exercise, MuscleGroup, Session, Unit } from '../../lib/types'
import { MUSCLE_GROUPS } from '../../lib/types'
import { epley } from '../../lib/e1rm'

/** Σ weight × reps across a session's working sets. */
export function sessionVolume(session: Session): number {
  let total = 0
  for (const entry of session.entries) {
    for (const set of entry.sets) {
      if (!set.isWarmup) total += set.weight * set.reps
    }
  }
  return total
}

export function workingSetCount(session: Session): number {
  let count = 0
  for (const entry of session.entries) {
    for (const set of entry.sets) {
      if (!set.isWarmup) count++
    }
  }
  return count
}

export interface MuscleSets {
  muscle: MuscleGroup
  sets: number
}

/**
 * Working sets per muscle group for one session. Primary muscles count 1.0
 * per working set, secondary 0.5 — the same weighting as weeklyVolume in
 * lib/volume. Only muscles with sets > 0, sorted descending (ties keep
 * MUSCLE_GROUPS order).
 */
export function sessionMuscleSets(
  session: Session,
  exercises: Map<string, Exercise>,
): MuscleSets[] {
  const totals = new Map<MuscleGroup, number>()
  for (const entry of session.entries) {
    const exercise = exercises.get(entry.exerciseId)
    if (!exercise) continue
    const workingSets = entry.sets.filter((s) => !s.isWarmup).length
    if (workingSets === 0) continue
    for (const m of exercise.primaryMuscles) {
      totals.set(m, (totals.get(m) ?? 0) + workingSets)
    }
    for (const m of exercise.secondaryMuscles) {
      totals.set(m, (totals.get(m) ?? 0) + workingSets * 0.5)
    }
  }
  return MUSCLE_GROUPS.filter((m) => (totals.get(m) ?? 0) > 0)
    .map((muscle) => ({ muscle, sets: totals.get(muscle) ?? 0 }))
    .sort((a, b) => b.sets - a.sets)
}

/** Compact volume for cards: "12,450 kg". */
export function formatVolume(volume: number, unit: Unit): string {
  return `${Math.round(volume).toLocaleString()} ${unit}`
}

/** "48 min" under an hour, "1:12" above. */
export function formatDuration(startedAt: number, finishedAt: number): string {
  const mins = Math.max(1, Math.round((finishedAt - startedAt) / 60_000))
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

/**
 * Per-session count of exercises whose best working-set e1RM beat the best
 * from all sessions strictly before it. The first-ever session for an
 * exercise never counts — there is no prior best to beat.
 */
export function prCountBySession(sessions: Session[]): Map<string, number> {
  const ordered = [...sessions]
    .filter((s) => s.finishedAt !== undefined)
    .sort((a, b) => a.startedAt - b.startedAt)

  const bestByExercise = new Map<string, number>()
  const counts = new Map<string, number>()

  for (const session of ordered) {
    const sessionBest = new Map<string, number>()
    for (const entry of session.entries) {
      for (const set of entry.sets) {
        if (set.isWarmup) continue
        const e1rm = epley(set.weight, set.reps)
        if (e1rm <= 0) continue
        const prev = sessionBest.get(entry.exerciseId) ?? 0
        if (e1rm > prev) sessionBest.set(entry.exerciseId, e1rm)
      }
    }
    let prs = 0
    for (const [exerciseId, e1rm] of sessionBest) {
      const prior = bestByExercise.get(exerciseId) ?? 0
      if (prior > 0 && e1rm > prior) prs++
      if (e1rm > prior) bestByExercise.set(exerciseId, e1rm)
    }
    counts.set(session.id, prs)
  }
  return counts
}
