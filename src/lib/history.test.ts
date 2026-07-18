import { describe, expect, it } from 'vitest'
import { historyForExercise } from './history'
import type { LoggedSet, Session, SessionEntry } from './types'

const DAY = 86_400_000
const BASE = new Date(2026, 6, 1, 18).getTime()

let nextId = 0
function set(weight: number, reps: number, opts?: { isWarmup?: boolean; rir?: number }): LoggedSet {
  return {
    id: `set-${nextId++}`,
    weight,
    reps,
    rir: opts?.rir,
    isWarmup: opts?.isWarmup ?? false,
    completedAt: BASE,
  }
}

function entry(exerciseId: string, sets: LoggedSet[]): SessionEntry {
  return { id: `entry-${nextId++}`, exerciseId, restSeconds: 150, sets }
}

function makeSession(daysAfterBase: number, entries: SessionEntry[], finished = true): Session {
  const startedAt = BASE + daysAfterBase * DAY
  return {
    id: `session-${nextId++}`,
    name: 'Upper A',
    startedAt,
    finishedAt: finished ? startedAt + 3_600_000 : undefined,
    entries,
  }
}

describe('historyForExercise', () => {
  it('keeps only working sets with reps, tagged with the session date', () => {
    const sessions = [
      makeSession(0, [
        entry('bench', [
          set(60, 8, { isWarmup: true }),
          set(100, 5, { rir: 2 }),
          set(100, 5),
          set(100, 0), // logged but never performed
        ]),
        entry('squat', [set(140, 5)]),
      ]),
    ]
    const history = historyForExercise(sessions, 'bench')
    expect(history).toEqual([
      {
        date: sessions[0].startedAt,
        sets: [
          { weight: 100, reps: 5, rir: 2 },
          { weight: 100, reps: 5, rir: undefined },
        ],
      },
    ])
  })

  it('excludes unfinished sessions', () => {
    const sessions = [
      makeSession(0, [entry('bench', [set(100, 5)])]),
      makeSession(2, [entry('bench', [set(102.5, 5)])], false), // still in progress
    ]
    const history = historyForExercise(sessions, 'bench')
    expect(history).toHaveLength(1)
    expect(history[0].sets[0].weight).toBe(100)
  })

  it('merges multiple entries of the same exercise within one session', () => {
    const sessions = [
      makeSession(0, [
        entry('bench', [set(100, 8), set(100, 8)]),
        entry('row', [set(80, 10)]),
        entry('bench', [set(80, 12)]), // back-off entry later in the session
      ]),
    ]
    const history = historyForExercise(sessions, 'bench')
    expect(history).toHaveLength(1)
    expect(history[0].sets.map((s) => s.weight)).toEqual([100, 100, 80])
  })

  it('returns points ascending by date regardless of input order', () => {
    const sessions = [
      makeSession(7, [entry('bench', [set(102.5, 5)])]),
      makeSession(0, [entry('bench', [set(100, 5)])]),
      makeSession(3, [entry('bench', [set(100, 8)])]),
    ]
    const history = historyForExercise(sessions, 'bench')
    expect(history.map((h) => h.sets[0].weight)).toEqual([100, 100, 102.5])
    expect(history[0].date).toBeLessThan(history[1].date)
    expect(history[1].date).toBeLessThan(history[2].date)
  })

  it('emits no point for sessions where the exercise only has warm-ups or is absent', () => {
    const sessions = [
      makeSession(0, [entry('bench', [set(60, 8, { isWarmup: true })])]),
      makeSession(1, [entry('squat', [set(140, 5)])]),
    ]
    expect(historyForExercise(sessions, 'bench')).toEqual([])
  })
})
