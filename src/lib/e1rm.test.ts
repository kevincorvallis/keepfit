import { describe, expect, it } from 'vitest'
import { bestE1rm, e1rmSeries, epley } from './e1rm'
import type { HistoryPoint } from './types'

describe('epley', () => {
  it('returns the weight itself for a single', () => {
    expect(epley(140, 1)).toBe(140)
  })

  it('estimates 1RM for moderate reps', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 2)
    expect(epley(60, 10)).toBeCloseTo(80, 5)
  })

  it('caps reps at 12 so high-rep sets do not inflate the estimate', () => {
    expect(epley(100, 12)).toBeCloseTo(140, 5)
    expect(epley(100, 20)).toBeCloseTo(140, 5)
    expect(epley(100, 30)).toBe(epley(100, 12))
  })

  it('returns 0 for non-positive weight or reps', () => {
    expect(epley(0, 8)).toBe(0)
    expect(epley(100, 0)).toBe(0)
    expect(epley(-50, 5)).toBe(0)
  })
})

describe('bestE1rm', () => {
  it('picks the set with the highest estimate, not the heaviest set', () => {
    // 100×5 ≈ 116.7 beats both 110×1 = 110 and 102.5×3 ≈ 112.8
    expect(bestE1rm([
      { weight: 110, reps: 1 },
      { weight: 100, reps: 5 },
      { weight: 102.5, reps: 3 },
    ])).toBeCloseTo(116.67, 2)
  })

  it('returns 0 for no sets', () => {
    expect(bestE1rm([])).toBe(0)
  })
})

describe('e1rmSeries', () => {
  it('sorts by date ascending and drops zero-value points', () => {
    const d1 = new Date(2026, 5, 1).getTime()
    const d2 = new Date(2026, 5, 8).getTime()
    const d3 = new Date(2026, 5, 15).getTime()
    const history: HistoryPoint[] = [
      { date: d3, sets: [{ weight: 100, reps: 5 }] },
      { date: d1, sets: [{ weight: 95, reps: 5 }] },
      { date: d2, sets: [{ weight: 0, reps: 10 }] }, // bodyweight-style set → e1rm 0
    ]
    const series = e1rmSeries(history)
    expect(series.map((p) => p.date)).toEqual([d1, d3])
    expect(series[0].e1rm).toBeCloseTo(110.83, 2)
    expect(series[1].e1rm).toBeCloseTo(116.67, 2)
  })

  it('returns an empty series for empty history', () => {
    expect(e1rmSeries([])).toEqual([])
  })
})
