import { describe, expect, it } from 'vitest'
import { sessionMuscleSets } from './sessionStats'
import type { Exercise, LoggedSet, Session, SessionEntry } from '../../lib/types'

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
function set(isWarmup = false): LoggedSet {
  return { id: `set-${nextId++}`, weight: 100, reps: 5, isWarmup, completedAt: 0 }
}

function entry(exerciseId: string, sets: LoggedSet[]): SessionEntry {
  return { id: `entry-${nextId++}`, exerciseId, restSeconds: 120, sets }
}

function session(entries: SessionEntry[]): Session {
  return { id: `session-${nextId++}`, name: 'Workout', startedAt: 0, finishedAt: 1, entries }
}

describe('sessionMuscleSets', () => {
  it('counts primary muscles at 1.0 and secondary at 0.5 per working set, sorted descending', () => {
    const s = session([
      entry('bench', [set(true), set(), set(), set()]), // 3 working
      entry('row', [set(), set()]), // 2 working
    ])
    expect(sessionMuscleSets(s, EXERCISES)).toEqual([
      { muscle: 'chest', sets: 3 },
      { muscle: 'back', sets: 2 },
      { muscle: 'shoulders', sets: 1.5 },
      { muscle: 'triceps', sets: 1.5 },
      { muscle: 'biceps', sets: 1 },
    ])
  })

  it('accumulates across entries for the same exercise', () => {
    const s = session([entry('bench', [set(), set()]), entry('bench', [set()])])
    expect(sessionMuscleSets(s, EXERCISES)[0]).toEqual({ muscle: 'chest', sets: 3 })
  })

  it('ignores warm-up-only entries and unknown exercises', () => {
    const s = session([
      entry('bench', [set(true), set(true)]),
      entry('deleted-exercise', [set()]),
    ])
    expect(sessionMuscleSets(s, EXERCISES)).toEqual([])
  })

  it('breaks ties in MUSCLE_GROUPS order', () => {
    const s = session([entry('bench', [set()]), entry('row', [set()])])
    const muscles = sessionMuscleSets(s, EXERCISES).map((r) => r.muscle)
    expect(muscles).toEqual(['chest', 'back', 'shoulders', 'biceps', 'triceps'])
  })
})
