import type { HistoryPoint } from './types'
import { e1rmSeries } from './e1rm'

export interface ExerciseFatigueInput {
  name: string
  history: HistoryPoint[]
  stallCount: number
  stallThreshold: number
}

export interface FatigueAssessment {
  suggestDeload: boolean
  /** User-facing reasons; empty when no deload is suggested. */
  reasons: string[]
}

/**
 * Trend-triggered deload detection (autoregulated, not calendar-based).
 * Signals: several exercises at/near their stall threshold, or estimated
 * 1RM declining across the last three sessions on multiple lifts.
 */
export function assessFatigue(exercises: ExerciseFatigueInput[]): FatigueAssessment {
  const reasons: string[] = []

  const stalling = exercises.filter(
    (e) => e.stallThreshold > 0 && e.stallCount >= Math.max(1, e.stallThreshold - 1),
  )
  if (stalling.length >= 3) {
    reasons.push(
      `${stalling.length} exercises are stalled or close to it (${stalling
        .slice(0, 3)
        .map((e) => e.name)
        .join(', ')}…).`.replace('…).', stalling.length > 3 ? '…).' : ').'),
    )
  }

  const declining = exercises.filter((e) => {
    const series = e1rmSeries(e.history)
    if (series.length < 3) return false
    const [a, b, c] = series.slice(-3)
    return b.e1rm < a.e1rm && c.e1rm < b.e1rm
  })
  if (declining.length >= 2) {
    reasons.push(
      `Estimated 1RM has dropped two sessions in a row on ${declining
        .map((e) => e.name)
        .slice(0, 3)
        .join(', ')}.`,
    )
  }

  return { suggestDeload: reasons.length > 0, reasons }
}
