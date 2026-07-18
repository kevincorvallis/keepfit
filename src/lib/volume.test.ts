import { describe, expect, it } from 'vitest'
import { weekStartOf, weeklyVolume } from './volume'
import type { Exercise, LoggedSet, Session, SessionEntry } from './types'

// 2026-07-13 is a Monday (local time).
const MONDAY = new Date(2026, 6, 13, 0, 0, 0, 0).getTime()

describe('weekStartOf', () => {
  it('maps a mid-week timestamp to Monday 00:00', () => {
    expect(weekStartOf(new Date(2026, 6, 15, 18, 30).getTime())).toBe(MONDAY)
  })

  it('maps a Sunday to the Monday six days earlier, not the next day', () => {
    expect(weekStartOf(new Date(2026, 6, 19, 22, 45).getTime())).toBe(MONDAY)
  })

  it('maps a Monday to the same day at midnight', () => {
    expect(weekStartOf(new Date(2026, 6, 13, 7, 5).getTime())).toBe(MONDAY)
  })
})

const bench: Exercise = {
  id: 'bench',
  name: 'Bench press',
  equipment: 'barbell',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'shoulders'],
}

const row: Exercise = {
  id: 'row',
  name: 'Barbell row',
  equipment: 'barbell',
  primaryMuscles: ['back'],
  secondaryMuscles: ['biceps'],
}

const EXERCISES = new Map([
  [bench.id, bench],
  [row.id, row],
])

let nextId = 0
function set(weight: number, reps: number, isWarmup = false): LoggedSet {
  return { id: `set-${nextId++}`, weight, reps, isWarmup, completedAt: MONDAY }
}

function entry(exerciseId: string, sets: LoggedSet[]): SessionEntry {
  return { id: `entry-${nextId++}`, exerciseId, restSeconds: 120, sets }
}

function sessionAt(startedAt: number, entries: SessionEntry[]): Session {
  return { id: `session-${nextId++}`, name: 'Workout', startedAt, finishedAt: startedAt + 3_600_000, entries }
}

describe('weeklyVolume', () => {
  it('counts primary muscles at 1.0 and secondary at 0.5 per working set', () => {
    const sessions = [
      sessionAt(new Date(2026, 6, 13, 17).getTime(), [
        entry('bench', [set(60, 8, true), set(80, 5, true), set(100, 5), set(100, 5), set(100, 5)]),
      ]),
    ]
    const weeks = weeklyVolume(sessions, EXERCISES)
    expect(weeks).toHaveLength(1)
    expect(weeks[0].weekStart).toBe(MONDAY)
    expect(weeks[0].perMuscle.chest).toBe(3) // warm-ups excluded
    expect(weeks[0].perMuscle.triceps).toBe(1.5)
    expect(weeks[0].perMuscle.shoulders).toBe(1.5)
  })

  it('aggregates sessions in the same week and buckets other weeks separately, ascending', () => {
    const week2Tuesday = new Date(2026, 6, 21, 18).getTime()
    const sessions = [
      // deliberately out of order: week 2 first
      sessionAt(week2Tuesday, [entry('row', [set(80, 8), set(80, 8), set(80, 8), set(80, 8)])]),
      sessionAt(new Date(2026, 6, 13, 17).getTime(), [entry('bench', [set(100, 5), set(100, 5)])]),
      sessionAt(new Date(2026, 6, 15, 17).getTime(), [entry('bench', [set(100, 5), set(100, 5), set(100, 5)])]),
    ]
    const weeks = weeklyVolume(sessions, EXERCISES)
    expect(weeks).toHaveLength(2)
    expect(weeks[0].weekStart).toBe(MONDAY)
    expect(weeks[1].weekStart).toBe(weekStartOf(week2Tuesday))
    expect(weeks[0].perMuscle.chest).toBe(5) // 2 + 3 across two sessions
    expect(weeks[0].perMuscle.triceps).toBe(2.5)
    expect(weeks[1].perMuscle.back).toBe(4)
    expect(weeks[1].perMuscle.biceps).toBe(2)
    expect(weeks[1].perMuscle.chest).toBeUndefined()
  })

  it('ignores warm-up-only entries and unknown exercises', () => {
    const sessions = [
      sessionAt(new Date(2026, 6, 14, 17).getTime(), [
        entry('bench', [set(60, 8, true), set(80, 3, true)]),
        entry('deleted-exercise', [set(100, 10)]),
      ]),
    ]
    const weeks = weeklyVolume(sessions, EXERCISES)
    expect(weeks).toHaveLength(1)
    expect(weeks[0].perMuscle).toEqual({})
  })

  it('returns no weeks for no sessions', () => {
    expect(weeklyVolume([], EXERCISES)).toEqual([])
  })
})
