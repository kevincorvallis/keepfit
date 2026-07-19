import { describe, expect, it } from 'vitest'
import {
  convertProgressionUnits,
  defaultProgression,
  isAnchorSession,
  suggestNext,
} from './progression'
import type { SuggestArgs, SuggestResult } from './progression'
import type { HistoryPoint, ProgressionConfig } from './types'

const DAY = 86_400_000
const NOW = new Date(2026, 6, 18, 12, 0, 0).getTime()

/** Realistic kg barbell double-progression config (bench/squat style). */
const barbell: ProgressionConfig = {
  mode: 'double',
  minReps: 5,
  maxReps: 8,
  increment: 2.5,
  stallThreshold: 2,
  deloadFraction: 0.1,
  targetRir: 2,
  roundTo: 2.5,
}

const novice: ProgressionConfig = {
  ...barbell,
  mode: 'linear',
  minReps: 5,
  maxReps: 5,
  stallThreshold: 3,
}

type SetTuple = [weight: number, reps: number, rir?: number]

function session(daysAgo: number, sets: SetTuple[]): HistoryPoint {
  return {
    date: NOW - daysAgo * DAY,
    sets: sets.map(([weight, reps, rir]) => ({ weight, reps, rir })),
  }
}

function suggest(overrides: Partial<SuggestArgs>): SuggestResult {
  return suggestNext({
    history: [],
    config: barbell,
    stallCount: 0,
    plannedSets: 3,
    unit: 'kg',
    now: NOW,
    ...overrides,
  })
}

describe('suggestNext — start', () => {
  it('suggests a start with weight 0 when there is no history', () => {
    const { target, nextStallCount } = suggest({ history: [] })
    expect(target.kind).toBe('start')
    expect(target.weight).toBe(0)
    expect(target.repsLow).toBe(5)
    expect(target.repsHigh).toBe(8)
    expect(target.sets).toBe(3)
    expect(target.explanation).toMatch(/first session/i)
    expect(nextStallCount).toBe(0)
  })

  it('treats history points with no sets as no history', () => {
    const { target } = suggest({ history: [{ date: NOW - 3 * DAY, sets: [] }] })
    expect(target.kind).toBe('start')
    expect(target.weight).toBe(0)
  })
})

describe('suggestNext — double progression', () => {
  it('adds the increment and resets the rep range when all sets hit maxReps', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 8], [100, 8], [100, 9]])],
      stallCount: 1,
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(102.5)
    expect(target.repsLow).toBe(5)
    expect(target.repsHigh).toBe(8)
    expect(target.explanation).toContain('8 reps')
    expect(target.explanation).toContain('+2.5 kg')
    expect(nextStallCount).toBe(0)
  })

  it('doubles the increment when maxed with trusted avg RIR above target + 1', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 8, 3], [100, 8, 3], [100, 8, 3]])],
      config: { ...barbell, targetRir: 1 },
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(105)
    expect(target.explanation).toContain('+5 kg')
    expect(target.explanation).toContain('in the tank')
    expect(nextStallCount).toBe(0)
  })

  it('ignores RIR 4 reports — outside the trusted 0–3 band, no double increment', () => {
    const { target } = suggest({
      history: [session(4, [[100, 8, 4], [100, 8, 4], [100, 8, 4]])],
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(102.5)
    expect(target.explanation).not.toContain('in the tank')
  })

  it('ignores RIR when fewer than half the sets report it', () => {
    const { target } = suggest({
      history: [session(4, [[100, 8, 4], [100, 8], [100, 8]])],
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(102.5)
  })

  it('holds when maxed but grinding at RIR 0 with targetRir 2', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 8, 0], [100, 8, 0], [100, 8, 0]])],
      stallCount: 1,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(target.explanation).toContain('RIR 0')
    expect(nextStallCount).toBe(0)
  })

  it('holds with stall reset when total reps beat the previous session at the same weight', () => {
    const { target, nextStallCount } = suggest({
      history: [
        session(8, [[100, 6], [100, 6], [100, 6]]),
        session(4, [[100, 7], [100, 6], [100, 6]]),
      ],
      stallCount: 1,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(target.explanation).toContain('chase 8 reps')
    expect(nextStallCount).toBe(0)
  })

  it('holds with stall reset on the first in-range session at a new weight', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 6], [100, 6], [100, 5]])],
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(nextStallCount).toBe(0)
  })

  it('increments the stall count when reps are flat versus the previous same-weight session', () => {
    const { target, nextStallCount } = suggest({
      history: [
        session(8, [[100, 6], [100, 6], [100, 6]]),
        session(4, [[100, 6], [100, 6], [100, 6]]),
      ],
      stallCount: 0,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(target.explanation).toContain('matched last session')
    expect(nextStallCount).toBe(1)
  })

  it('deloads with down-rounded weight once flat reps reach the stall threshold', () => {
    const { target, nextStallCount } = suggest({
      history: [
        session(8, [[102.5, 6], [102.5, 6], [102.5, 6]]),
        session(4, [[102.5, 6], [102.5, 6], [102.5, 6]]),
      ],
      stallCount: 1,
    })
    // 102.5 × 0.9 = 92.25 → rounded DOWN to 90, not nearest (92.5).
    expect(target.kind).toBe('deload')
    expect(target.weight).toBe(90)
    expect(target.explanation).toContain('deload')
    expect(nextStallCount).toBe(0)
  })

  it('treats a set below minReps without RIR as a stall', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 4], [100, 6], [100, 6]])],
      stallCount: 0,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(target.explanation).toContain('at least 5 reps')
    expect(nextStallCount).toBe(1)
  })

  it('deloads when a below-minReps miss reaches the stall threshold', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 4], [100, 4], [100, 6]])],
      stallCount: 1,
    })
    expect(target.kind).toBe('deload')
    expect(target.weight).toBe(90)
    expect(nextStallCount).toBe(0)
  })

  it('holds without counting a stall when below-min sets were stopped early (RIR ≥ 2)', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 4, 3], [100, 6], [100, 6]])],
      stallCount: 1,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(target.explanation).toContain('stopped short')
    expect(nextStallCount).toBe(1) // unchanged, not incremented
  })

  it('does not treat a below-min set reported at RIR 4 as stopped early — untrusted band', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 4, 4], [100, 6], [100, 6]])],
      stallCount: 0,
    })
    expect(target.kind).toBe('hold')
    expect(target.explanation).toContain('at least 5 reps')
    expect(nextStallCount).toBe(1)
  })

  it('only counts sets at the top weight — back-off sets do not block the increase', () => {
    const { target } = suggest({
      history: [session(4, [[100, 8], [100, 8], [80, 12]])],
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(102.5)
  })

  it('only counts sets at the top weight — a light finisher cannot mask a top-set miss', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 4], [100, 8], [60, 15]])],
      stallCount: 0,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(nextStallCount).toBe(1)
  })

  it('clamps a negative stored stall count to zero before counting', () => {
    const { nextStallCount } = suggest({
      history: [
        session(8, [[100, 6], [100, 6], [100, 6]]),
        session(4, [[100, 6], [100, 6], [100, 6]]),
      ],
      stallCount: -5,
    })
    expect(nextStallCount).toBe(1)
  })
})

describe('suggestNext — deload weight guarantee', () => {
  it('deload is strictly below the last weight even when rounding would land back on it', () => {
    const { target } = suggest({
      history: [
        session(8, [[100, 6], [100, 6], [100, 6]]),
        session(4, [[100, 6], [100, 6], [100, 6]]),
      ],
      config: { ...barbell, deloadFraction: 0 },
      stallCount: 1,
    })
    expect(target.kind).toBe('deload')
    expect(target.weight).toBe(97.5)
    expect(target.weight).toBeLessThan(100)
  })

  it('a standard 10% deload is strictly below the last weight', () => {
    const { target } = suggest({
      history: [
        session(8, [[62.5, 6], [62.5, 6], [62.5, 6]]),
        session(4, [[62.5, 6], [62.5, 6], [62.5, 6]]),
      ],
      stallCount: 1,
    })
    expect(target.kind).toBe('deload')
    expect(target.weight).toBe(55) // 62.5 × 0.9 = 56.25 → down to 55
    expect(target.weight).toBeLessThan(62.5)
  })
})

describe('suggestNext — layoff decay', () => {
  it('eases back 5% after a three-week layoff, even after a maxed session', () => {
    const { target, nextStallCount } = suggest({
      history: [session(21, [[100, 8], [100, 8], [100, 8]])],
      stallCount: 1,
    })
    expect(target.kind).toBe('repeat')
    expect(target.weight).toBe(95)
    expect(target.explanation).toContain('easing back 5%')
    expect(nextStallCount).toBe(0)
  })

  it('caps the layoff reduction at 25%', () => {
    const { target } = suggest({
      history: [session(90, [[100, 8], [100, 8], [100, 8]])],
    })
    expect(target.kind).toBe('repeat')
    expect(target.weight).toBe(75)
    expect(target.explanation).toContain('easing back 25%')
  })

  it('does not decay at exactly 14 days off', () => {
    const { target } = suggest({
      history: [session(14, [[100, 8], [100, 8], [100, 8]])],
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(102.5)
  })
})

describe('suggestNext — linear mode', () => {
  it('adds the increment when every set hits the target reps', () => {
    const { target, nextStallCount } = suggest({
      history: [session(3, [[100, 5], [100, 5], [100, 5]])],
      config: novice,
      stallCount: 2,
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(102.5)
    expect(target.explanation).toContain('3×5')
    expect(nextStallCount).toBe(0)
  })

  it('holds and counts a stall on a missed rep under the threshold', () => {
    const { target, nextStallCount } = suggest({
      history: [session(3, [[100, 5], [100, 4], [100, 5]])],
      config: novice,
      stallCount: 0,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(nextStallCount).toBe(1)
  })

  it('deloads when a miss reaches the stall threshold', () => {
    const { target, nextStallCount } = suggest({
      history: [session(3, [[100, 5], [100, 4], [100, 5]])],
      config: novice,
      stallCount: 2,
    })
    expect(target.kind).toBe('deload')
    expect(target.weight).toBe(90)
    expect(target.explanation).toContain('deload')
    expect(nextStallCount).toBe(0)
  })
})

describe('suggestNext — incomplete sessions', () => {
  it('repeats instead of progressing when fewer sets were performed than planned', () => {
    const { target, nextStallCount } = suggest({
      history: [session(4, [[100, 8]])], // 1 of 3 planned sets, maxed
      stallCount: 1,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
    expect(target.explanation).toContain('1 of 3 planned sets')
    expect(nextStallCount).toBe(1) // no evidence either way — unchanged
  })

  it('does not let a single maxed set earn a linear increment', () => {
    const { target } = suggest({
      history: [session(3, [[100, 5]])],
      config: novice,
    })
    expect(target.kind).toBe('hold')
    expect(target.weight).toBe(100)
  })

  it('still increases when planned volume was completed (back-offs count as performed sets)', () => {
    const { target } = suggest({
      history: [session(4, [[100, 8], [100, 8], [80, 12]])],
      plannedSets: 3,
    })
    expect(target.kind).toBe('increase')
    expect(target.weight).toBe(102.5)
  })
})

describe('suggestNext — light-session anchor', () => {
  it('a recent light freestyle day does not collapse the progression base', () => {
    const { target } = suggest({
      history: [
        session(8, [[100, 7], [100, 7], [100, 6]]),
        session(1, [[60, 15], [60, 15], [60, 15]]), // pump day, far below tier
      ],
    })
    // Anchored on the 100 kg session, not the 60 kg one.
    expect(target.weight).toBe(100)
    expect(target.kind).toBe('hold')
  })

  it('a completed deload session IS the new anchor (within the deload band)', () => {
    const { target, nextStallCount } = suggest({
      history: [
        session(8, [[100, 6], [100, 6], [100, 6]]),
        session(4, [[100, 6], [100, 6], [100, 6]]),
        session(1, [[90, 6], [90, 6], [90, 6]]), // −10% deload, done
      ],
      stallCount: 0,
    })
    expect(target.weight).toBe(90)
    expect(target.kind).toBe('hold')
    expect(nextStallCount).toBe(0)
  })

  it('the layoff-decayed weight stays the base when the heavier session is old', () => {
    const { target } = suggest({
      history: [
        session(40, [[100, 8], [100, 8], [100, 8]]),
        session(2, [[75, 8], [75, 8], [75, 8]]), // eased back after the layoff
      ],
    })
    // The 100 kg session is >14 days old — it cannot reclaim the anchor.
    expect(target.weight).toBeLessThanOrEqual(80)
  })
})

describe('isAnchorSession', () => {
  it('is true for a normal latest session and false for a light outlier', () => {
    const heavy = session(8, [[100, 7], [100, 7], [100, 7]])
    const light = session(1, [[60, 15], [60, 15]])
    expect(isAnchorSession([heavy], barbell, NOW)).toBe(true)
    expect(isAnchorSession([heavy, light], barbell, NOW)).toBe(false)
  })

  it('is false for empty history', () => {
    expect(isAnchorSession([], barbell, NOW)).toBe(false)
  })
})

describe('suggestNext — post-deload baseline', () => {
  it('does not compare the first session back at a weight against pre-deload totals', () => {
    const { target, nextStallCount } = suggest({
      history: [
        session(12, [[90, 8], [90, 8], [90, 8]]), // weeks-old peak at 90
        session(8, [[100, 6], [100, 6], [100, 6]]),
        session(4, [[100, 6], [100, 6], [100, 6]]),
        session(1, [[90, 6], [90, 6], [90, 6]]), // deload rebuild — fresh baseline
      ],
      stallCount: 0,
    })
    expect(target.kind).toBe('hold')
    expect(target.explanation).toContain('chase 8 reps')
    expect(nextStallCount).toBe(0) // NOT a stall — the drop was instructed
  })
})

describe('suggestNext — manual mode', () => {
  it('repeats the last top weight and leaves the stall count alone', () => {
    const { target, nextStallCount } = suggest({
      history: [session(3, [[100, 8], [100, 8], [100, 8]])],
      config: { ...barbell, mode: 'manual' },
      stallCount: 2,
    })
    expect(target.kind).toBe('repeat')
    expect(target.weight).toBe(100)
    expect(target.explanation).toMatch(/auto-progression is off/i)
    expect(nextStallCount).toBe(2)
  })
})

describe('suggestNext — start/finish protocol (no double counting)', () => {
  /**
   * Mirrors state/workout.ts bookkeeping: on finish, the stored count
   * advances by evaluating history EXCLUDING the finished session (and only
   * when the finished session is the engine's anchor); on start, the full
   * history is evaluated with the stored count. Each session is therefore
   * counted exactly once.
   */
  function finishAdvance(all: HistoryPoint[], stored: number, config: ProgressionConfig): number {
    if (!isAnchorSession(all, config, NOW)) return stored
    return suggestNext({
      history: all.slice(0, -1),
      config,
      stallCount: stored,
      plannedSets: 3,
      unit: 'kg',
      now: NOW,
    }).nextStallCount
  }

  it('one missed linear session holds; only the second deloads — never one early', () => {
    const config = { ...novice, stallThreshold: 2 }
    const s1 = session(9, [[100, 5], [100, 5], [100, 5]])
    const s2 = session(6, [[102.5, 5], [102.5, 5], [102.5, 4]])
    const s3 = session(3, [[102.5, 5], [102.5, 4], [102.5, 5]])

    let stored = 0
    stored = finishAdvance([s1], stored, config)
    expect(stored).toBe(0)

    stored = finishAdvance([s1, s2], stored, config)
    const afterOneMiss = suggest({ history: [s1, s2], config, stallCount: stored })
    expect(afterOneMiss.target.kind).toBe('hold') // NOT a deload after one miss

    stored = finishAdvance([s1, s2, s3], stored, config)
    const afterTwoMisses = suggest({ history: [s1, s2, s3], config, stallCount: stored })
    expect(afterTwoMisses.target.kind).toBe('deload')
  })

  it('a light freestyle day between programmed sessions advances nothing', () => {
    const s1 = session(8, [[100, 6], [100, 6], [100, 6]])
    const s2 = session(4, [[100, 6], [100, 6], [100, 6]])
    const pump = session(1, [[60, 15], [60, 15], [60, 15]])

    let stored = 0
    stored = finishAdvance([s1], stored, barbell)
    stored = finishAdvance([s1, s2], stored, barbell)
    const beforePump = stored
    stored = finishAdvance([s1, s2, pump], stored, barbell)
    expect(stored).toBe(beforePump) // pump day is not the anchor — untouched

    const next = suggest({ history: [s1, s2, pump], stallCount: stored })
    expect(next.target.weight).toBe(100) // still anchored on the working tier
  })
})

describe('convertProgressionUnits', () => {
  it('maps kg defaults onto their lb counterparts', () => {
    const bb = convertProgressionUnits(defaultProgression('barbell', 'kg'), 'kg', 'lb')
    expect(bb).toMatchObject({ increment: 5, roundTo: 5 })
    const db = convertProgressionUnits(defaultProgression('dumbbell', 'kg'), 'kg', 'lb')
    expect(db).toMatchObject({ increment: 5, roundTo: 5 })
    const iso = convertProgressionUnits(
      defaultProgression('cable', 'kg', { isolation: true }),
      'kg',
      'lb',
    )
    expect(iso).toMatchObject({ increment: 2.5, roundTo: 2.5 })
  })

  it('maps lb defaults onto loadable kg steps', () => {
    const bb = convertProgressionUnits(defaultProgression('barbell', 'lb'), 'lb', 'kg')
    expect(bb).toMatchObject({ increment: 2.5, roundTo: 2.5 })
    const iso = convertProgressionUnits(
      defaultProgression('machine', 'lb', { isolation: true }),
      'lb',
      'kg',
    )
    expect(iso).toMatchObject({ increment: 2.5, roundTo: 2.5 })
  })

  it('converts custom values to the nearest micro-plate step, never below it', () => {
    const custom = { ...barbell, increment: 5, roundTo: 2.5 }
    const lb = convertProgressionUnits(custom, 'kg', 'lb')
    expect(lb.increment).toBe(10) // 5 kg ≈ 11 lb → 10
    expect(lb.roundTo).toBe(5)
    const tiny = convertProgressionUnits({ ...barbell, increment: 0.5, roundTo: 0.5 }, 'kg', 'lb')
    expect(tiny.increment).toBe(2.5) // clamped to the smallest loadable pair
  })

  it('leaves non-weight fields and same-unit configs untouched', () => {
    const converted = convertProgressionUnits(barbell, 'kg', 'lb')
    expect(converted).toMatchObject({ mode: 'double', minReps: 5, maxReps: 8, stallThreshold: 2 })
    expect(convertProgressionUnits(barbell, 'kg', 'kg')).toEqual(barbell)
  })
})

describe('defaultProgression', () => {
  it('barbell kg: 5–8 double, 2.5 kg steps, stall threshold 2', () => {
    expect(defaultProgression('barbell', 'kg')).toEqual({
      mode: 'double',
      minReps: 5,
      maxReps: 8,
      increment: 2.5,
      roundTo: 2.5,
      stallThreshold: 2,
      deloadFraction: 0.1,
      targetRir: 2,
    })
  })

  it('barbell lb linear: 5×5 with 5 lb steps', () => {
    const config = defaultProgression('barbell', 'lb', { mode: 'linear' })
    expect(config.mode).toBe('linear')
    expect(config.minReps).toBe(5)
    expect(config.maxReps).toBe(5)
    expect(config.increment).toBe(5)
    expect(config.roundTo).toBe(5)
    expect(config.stallThreshold).toBe(2)
  })

  it('dumbbell: 8–12 with 2 kg / 5 lb steps and stall threshold 3', () => {
    const kg = defaultProgression('dumbbell', 'kg')
    expect(kg).toMatchObject({ minReps: 8, maxReps: 12, increment: 2, roundTo: 2, stallThreshold: 3 })
    const lb = defaultProgression('dumbbell', 'lb')
    expect(lb).toMatchObject({ increment: 5, roundTo: 5 })
  })

  it('bodyweight: 8–15 rep range', () => {
    expect(defaultProgression('bodyweight', 'kg')).toMatchObject({
      minReps: 8,
      maxReps: 15,
      increment: 2.5,
      stallThreshold: 3,
    })
  })

  it('machine and cable compounds: 10–15 with 2.5 kg steps', () => {
    const machine = defaultProgression('machine', 'kg')
    expect(machine).toMatchObject({ minReps: 10, maxReps: 15, increment: 2.5, roundTo: 2.5 })
    expect(defaultProgression('cable', 'kg')).toEqual(machine)
  })

  it('isolation machine/cable: 12–20 with 1.25 kg micro / 5 lb stack steps', () => {
    expect(defaultProgression('cable', 'kg', { isolation: true })).toMatchObject({
      minReps: 12,
      maxReps: 20,
      increment: 1.25,
      roundTo: 1.25,
    })
    expect(defaultProgression('machine', 'lb', { isolation: true })).toMatchObject({
      increment: 5,
      roundTo: 5,
    })
  })
})
