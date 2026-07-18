import { describe, expect, it } from 'vitest'
import { assessFatigue } from './deload'
import type { ExerciseFatigueInput } from './deload'
import type { HistoryPoint } from './types'

const DAY = 86_400_000
const NOW = new Date(2026, 6, 18).getTime()

/** Three sessions whose best e1RM follows the given rep counts at 100 kg. */
function trend(reps: [number, number, number]): HistoryPoint[] {
  return reps.map((r, i) => ({
    date: NOW - (14 - i * 7) * DAY,
    sets: [{ weight: 100, reps: r }],
  }))
}

function lift(name: string, overrides?: Partial<ExerciseFatigueInput>): ExerciseFatigueInput {
  return { name, history: [], stallCount: 0, stallThreshold: 2, ...overrides }
}

describe('assessFatigue — stall signal', () => {
  it('suggests a deload when three exercises are at or near their stall threshold', () => {
    const result = assessFatigue([
      lift('Squat', { stallCount: 1, stallThreshold: 2 }), // one away
      lift('Bench press', { stallCount: 2, stallThreshold: 2 }), // at threshold
      lift('Barbell row', { stallCount: 2, stallThreshold: 3 }), // one away
      lift('Curl', { stallCount: 0, stallThreshold: 3 }),
    ])
    expect(result.suggestDeload).toBe(true)
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toContain('3 exercises are stalled or close to it')
    expect(result.reasons[0]).toContain('Squat')
    expect(result.reasons[0]).toContain('Bench press')
    expect(result.reasons[0]).toContain('Barbell row')
  })

  it('stays quiet with only two stalling exercises', () => {
    const result = assessFatigue([
      lift('Squat', { stallCount: 2 }),
      lift('Bench press', { stallCount: 2 }),
      lift('Deadlift'),
    ])
    expect(result.suggestDeload).toBe(false)
    expect(result.reasons).toEqual([])
  })

  it('names at most three exercises when more are stalling', () => {
    const result = assessFatigue([
      lift('Squat', { stallCount: 2 }),
      lift('Bench press', { stallCount: 2 }),
      lift('Barbell row', { stallCount: 2 }),
      lift('Overhead press', { stallCount: 2 }),
    ])
    expect(result.suggestDeload).toBe(true)
    expect(result.reasons[0]).toContain('4 exercises')
    expect(result.reasons[0]).not.toContain('Overhead press')
  })
})

describe('assessFatigue — e1RM trend signal', () => {
  it('suggests a deload when estimated 1RM declines two sessions running on two lifts', () => {
    const result = assessFatigue([
      lift('Squat', { history: trend([8, 7, 6]) }),
      lift('Bench press', { history: trend([6, 5, 4]) }),
      lift('Deadlift', { history: trend([5, 5, 6]) }),
    ])
    expect(result.suggestDeload).toBe(true)
    expect(result.reasons).toHaveLength(1)
    expect(result.reasons[0]).toContain('dropped two sessions in a row')
    expect(result.reasons[0]).toContain('Squat')
    expect(result.reasons[0]).toContain('Bench press')
    expect(result.reasons[0]).not.toContain('Deadlift')
  })

  it('one declining lift is not enough', () => {
    const result = assessFatigue([
      lift('Squat', { history: trend([8, 7, 6]) }),
      lift('Bench press', { history: trend([6, 6, 7]) }),
    ])
    expect(result.suggestDeload).toBe(false)
  })

  it('a flat middle session does not count as a decline', () => {
    const result = assessFatigue([
      lift('Squat', { history: trend([8, 8, 6]) }),
      lift('Bench press', { history: trend([8, 8, 6]) }),
    ])
    expect(result.suggestDeload).toBe(false)
  })

  it('needs at least three sessions of history to call a trend', () => {
    const twoSessions = trend([8, 7, 6]).slice(1)
    const result = assessFatigue([
      lift('Squat', { history: twoSessions }),
      lift('Bench press', { history: twoSessions }),
    ])
    expect(result.suggestDeload).toBe(false)
  })
})

describe('assessFatigue — healthy training', () => {
  it('suggests nothing when lifts are progressing', () => {
    const result = assessFatigue([
      lift('Squat', { history: trend([5, 6, 8]) }),
      lift('Bench press', { history: trend([6, 7, 8]) }),
      lift('Deadlift', { history: trend([5, 5, 5]) }),
    ])
    expect(result).toEqual({ suggestDeload: false, reasons: [] })
  })

  it('suggests nothing for an empty exercise list', () => {
    expect(assessFatigue([])).toEqual({ suggestDeload: false, reasons: [] })
  })
})
