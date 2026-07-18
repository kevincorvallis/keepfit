import type { HistoryPoint, WorkingSet } from './types'

/**
 * Epley estimated 1RM. Reps are capped at 12 — beyond that the formula's
 * error grows faster than its usefulness (fixed-coefficient formulas are
 * known to be biased at high reps).
 */
export function epley(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  const capped = Math.min(reps, 12)
  return weight * (1 + capped / 30)
}

export function bestE1rm(sets: WorkingSet[]): number {
  return sets.reduce((best, s) => Math.max(best, epley(s.weight, s.reps)), 0)
}

export interface E1rmPoint {
  date: number
  e1rm: number
}

/** Per-session best e1RM series, ascending by date. */
export function e1rmSeries(history: HistoryPoint[]): E1rmPoint[] {
  return history
    .map((h) => ({ date: h.date, e1rm: bestE1rm(h.sets) }))
    .filter((p) => p.e1rm > 0)
    .sort((a, b) => a.date - b.date)
}
