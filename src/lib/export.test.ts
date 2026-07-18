import { describe, expect, it } from 'vitest'
import { parseImport, sessionsToCsv, toJson } from './export'
import type { ExportBundle } from './export'
import type { Exercise, Program, Session, Settings } from './types'

const squat: Exercise = {
  id: 'squat',
  name: 'Squat, high bar',
  equipment: 'barbell',
  primaryMuscles: ['quads'],
  secondaryMuscles: ['glutes'],
}

const pullup: Exercise = {
  id: 'pullup',
  name: 'Pull-up "wide"',
  equipment: 'bodyweight',
  primaryMuscles: ['back'],
  secondaryMuscles: ['biceps'],
}

const settings: Settings = {
  id: 'app',
  unit: 'kg',
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  volumeBands: { chest: { low: 10, high: 20 } },
  restTimerSound: true,
}

const program: Program = {
  id: 'prog-1',
  name: 'Upper/Lower',
  days: [
    {
      id: 'day-1',
      name: 'Upper',
      slots: [
        {
          id: 'slot-1',
          exerciseId: 'squat',
          sets: 3,
          restSeconds: 180,
          progression: {
            mode: 'double',
            minReps: 5,
            maxReps: 8,
            increment: 2.5,
            stallThreshold: 2,
            deloadFraction: 0.1,
            targetRir: 2,
            roundTo: 2.5,
          },
        },
      ],
    },
  ],
  createdAt: Date.UTC(2026, 5, 1),
}

const upperSession: Session = {
  id: 'sess-2',
  name: 'Upper, day 1',
  startedAt: Date.UTC(2026, 6, 13, 10, 0, 0),
  finishedAt: Date.UTC(2026, 6, 13, 11, 0, 0),
  entries: [
    {
      id: 'e-1',
      exerciseId: 'squat',
      restSeconds: 180,
      sets: [
        { id: 's-1', weight: 60, reps: 8, isWarmup: true, completedAt: Date.UTC(2026, 6, 13, 10, 5, 0) },
        { id: 's-2', weight: 100, reps: 5, rir: 2, isWarmup: false, completedAt: Date.UTC(2026, 6, 13, 10, 10, 0) },
      ],
    },
    {
      id: 'e-2',
      exerciseId: 'pullup',
      restSeconds: 120,
      sets: [
        { id: 's-3', weight: 0, reps: 8, rir: 1, isWarmup: false, completedAt: Date.UTC(2026, 6, 13, 10, 20, 0) },
      ],
    },
  ],
}

const lowerSession: Session = {
  id: 'sess-1',
  name: 'Lower',
  startedAt: Date.UTC(2026, 6, 6, 9, 0, 0),
  finishedAt: Date.UTC(2026, 6, 6, 10, 0, 0),
  entries: [
    {
      id: 'e-3',
      exerciseId: 'ghost',
      restSeconds: 120,
      sets: [{ id: 's-4', weight: 140, reps: 5, isWarmup: false, completedAt: Date.UTC(2026, 6, 6, 9, 30, 0) }],
    },
  ],
}

function makeBundle(): Omit<ExportBundle, 'schemaVersion'> {
  return {
    exportedAt: Date.UTC(2026, 6, 18, 12, 0, 0),
    settings,
    exercises: [squat, pullup],
    programs: [program],
    sessions: [upperSession, lowerSession],
    progressionState: [{ exerciseId: 'squat', stallCount: 1, updatedAt: Date.UTC(2026, 6, 13) }],
  }
}

describe('toJson → parseImport round trip', () => {
  it('preserves every table and stamps schemaVersion 1', () => {
    const bundle = makeBundle()
    const parsed = parseImport(toJson(bundle))
    expect(parsed).toEqual({ schemaVersion: 1, ...bundle })
  })
})

describe('parseImport rejections', () => {
  it('rejects malformed JSON with a plain-language message', () => {
    expect(() => parseImport('{"schemaVersion": 1,')).toThrowError('That file is not valid JSON.')
  })

  it('rejects an unsupported schema version, naming it', () => {
    const json = JSON.stringify({ ...makeBundle(), schemaVersion: 2 })
    expect(() => parseImport(json)).toThrowError(/Unsupported schema version 2/)
  })

  it('rejects JSON with no schema version at all', () => {
    expect(() => parseImport(JSON.stringify(makeBundle()))).toThrowError(/Unsupported schema version undefined/)
  })

  it('rejects a bundle missing a table, naming the missing key', () => {
    const { progressionState: _dropped, ...partial } = { ...makeBundle(), schemaVersion: 1 }
    expect(() => parseImport(JSON.stringify(partial))).toThrowError('Backup is missing "progressionState".')
  })
})

describe('sessionsToCsv', () => {
  const exercises = new Map([
    [squat.id, squat],
    [pullup.id, pullup],
  ])

  it('writes one escaped row per set, sessions ordered by date', () => {
    // deliberately passed newest-first; CSV must still be chronological
    const csv = sessionsToCsv([upperSession, lowerSession], exercises)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('date,session,exercise,set_number,is_warmup,weight,reps,rir,completed_at')
    // unknown exercise falls back to its id; no rir → empty field
    expect(lines[1]).toBe('2026-07-06,Lower,ghost,1,no,140,5,,2026-07-06T09:30:00.000Z')
    // names with commas are quoted; warm-up flag and missing rir serialize correctly
    expect(lines[2]).toBe('2026-07-13,"Upper, day 1","Squat, high bar",1,yes,60,8,,2026-07-13T10:05:00.000Z')
    expect(lines[3]).toBe('2026-07-13,"Upper, day 1","Squat, high bar",2,no,100,5,2,2026-07-13T10:10:00.000Z')
    // embedded quotes are doubled per RFC 4180
    expect(lines[4]).toBe('2026-07-13,"Upper, day 1","Pull-up ""wide""",1,no,0,8,1,2026-07-13T10:20:00.000Z')
    expect(lines).toHaveLength(5)
  })

  it('produces only the header for no sessions', () => {
    expect(sessionsToCsv([], exercises)).toBe('date,session,exercise,set_number,is_warmup,weight,reps,rir,completed_at')
  })
})
