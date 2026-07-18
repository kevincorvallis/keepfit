import type { Unit } from './types'

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5]
export const DEFAULT_BAR_KG = 20
export const DEFAULT_BAR_LB = 45

export function defaultPlates(unit: Unit): number[] {
  return unit === 'kg' ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB
}

export function defaultBarWeight(unit: Unit): number {
  return unit === 'kg' ? DEFAULT_BAR_KG : DEFAULT_BAR_LB
}

/** Round a weight to a step, avoiding float dust (e.g. 61.35 → 61.25). */
export function roundToStep(
  weight: number,
  step: number,
  mode: 'nearest' | 'down' | 'up' = 'nearest',
): number {
  if (step <= 0) return weight
  const ratio = weight / step
  const n = mode === 'down' ? Math.floor(ratio + 1e-9) : mode === 'up' ? Math.ceil(ratio - 1e-9) : Math.round(ratio)
  return Math.round(n * step * 1000) / 1000
}

/** Smallest achievable barbell increment: two of the smallest plate. */
export function smallestBarbellStep(plates: number[]): number {
  if (plates.length === 0) return 2.5
  return Math.min(...plates) * 2
}

export interface Loadout {
  /** Plates on one side, heaviest first. */
  perSide: number[]
  /** Bar + 2 × per-side total; equals target when `exact`. */
  achieved: number
  exact: boolean
}

/**
 * Greedy per-side plate solution. With standard doubling inventories the
 * greedy answer is optimal; with unlimited plate counts it always terminates.
 */
export function plateLoadout(target: number, barWeight: number, plates: number[]): Loadout {
  const sorted = [...plates].sort((a, b) => b - a)
  let remaining = Math.max(0, (target - barWeight) / 2)
  const perSide: number[] = []
  for (const p of sorted) {
    while (remaining >= p - 1e-9) {
      perSide.push(p)
      remaining = Math.round((remaining - p) * 1000) / 1000
    }
  }
  const achieved = Math.round((barWeight + perSide.reduce((a, b) => a + b, 0) * 2) * 1000) / 1000
  return { perSide, achieved, exact: Math.abs(achieved - target) < 1e-6 }
}

export function formatWeight(weight: number, unit: Unit): string {
  const rounded = Math.round(weight * 100) / 100
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded} ${unit}`
}

export function formatPlates(perSide: number[]): string {
  if (perSide.length === 0) return 'empty bar'
  const counts = new Map<number, number>()
  for (const p of perSide) counts.set(p, (counts.get(p) ?? 0) + 1)
  return [...counts.entries()].map(([p, n]) => (n > 1 ? `${n}×${p}` : `${p}`)).join(' + ')
}
