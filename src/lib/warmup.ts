import type { Equipment } from './types'
import { roundToStep } from './plates'

export interface WarmupSet {
  weight: number
  reps: number
}

/**
 * Ramp toward a working weight. Barbell ramps start with the empty bar;
 * other equipment uses a short two-step ramp. Steps that land at or above
 * the working weight (or below the bar) are dropped, so light working
 * weights naturally get shorter ramps.
 */
export function warmupPlan(args: {
  workingWeight: number
  equipment: Equipment
  barWeight: number
  roundTo: number
}): WarmupSet[] {
  const { workingWeight, equipment, barWeight, roundTo } = args
  if (workingWeight <= 0) return []

  if (equipment === 'bodyweight') return []

  if (equipment === 'barbell') {
    const sets: WarmupSet[] = [{ weight: barWeight, reps: 10 }]
    const ramp: Array<[number, number]> = [
      [0.4, 8],
      [0.6, 5],
      [0.8, 3],
      [0.9, 1],
    ]
    for (const [fraction, reps] of ramp) {
      const w = roundToStep(workingWeight * fraction, roundTo, 'nearest')
      if (w <= barWeight || w >= workingWeight) continue
      sets.push({ weight: w, reps })
    }
    // Only ramp sets meaningfully below the working weight survive; dedupe.
    return sets.filter((s, i, arr) => i === 0 || s.weight > arr[i - 1].weight)
  }

  const sets: WarmupSet[] = []
  for (const [fraction, reps] of [
    [0.5, 10],
    [0.75, 5],
  ] as Array<[number, number]>) {
    const w = roundToStep(workingWeight * fraction, roundTo, 'nearest')
    if (w > 0 && w < workingWeight) sets.push({ weight: w, reps })
  }
  return sets.filter((s, i, arr) => i === 0 || s.weight > arr[i - 1].weight)
}
