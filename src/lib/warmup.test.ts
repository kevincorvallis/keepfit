import { describe, expect, it } from 'vitest'
import { warmupPlan } from './warmup'

describe('warmupPlan — barbell', () => {
  it('ramps a 140 kg squat from the empty bar through ascending unique steps', () => {
    const plan = warmupPlan({ workingWeight: 140, equipment: 'barbell', barWeight: 20, roundTo: 2.5 })
    expect(plan).toEqual([
      { weight: 20, reps: 10 },
      { weight: 55, reps: 8 },
      { weight: 85, reps: 5 },
      { weight: 112.5, reps: 3 },
      { weight: 125, reps: 1 },
    ])
    // structural guarantees: starts at the bar, strictly ascending, all below the work weight
    expect(plan[0].weight).toBe(20)
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].weight).toBeGreaterThan(plan[i - 1].weight)
      expect(plan[i].weight).toBeLessThan(140)
    }
  })

  it('gives just the bar for a light 25 kg working weight', () => {
    const plan = warmupPlan({ workingWeight: 25, equipment: 'barbell', barWeight: 20, roundTo: 2.5 })
    expect(plan).toEqual([{ weight: 20, reps: 10 }])
  })

  it('shortens the ramp for a moderate 60 kg bench', () => {
    const plan = warmupPlan({ workingWeight: 60, equipment: 'barbell', barWeight: 20, roundTo: 2.5 })
    expect(plan[0]).toEqual({ weight: 20, reps: 10 })
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].weight).toBeGreaterThan(plan[i - 1].weight)
      expect(plan[i].weight).toBeLessThan(60)
    }
  })
})

describe('warmupPlan — other equipment', () => {
  it('uses a two-step ramp at 50% and 75% for machines', () => {
    const plan = warmupPlan({ workingWeight: 60, equipment: 'machine', barWeight: 20, roundTo: 2.5 })
    expect(plan).toEqual([
      { weight: 30, reps: 10 },
      { weight: 45, reps: 5 },
    ])
  })

  it('dedupes steps that round to the same weight on very light cable work', () => {
    const plan = warmupPlan({ workingWeight: 4, equipment: 'cable', barWeight: 0, roundTo: 2.5 })
    expect(plan).toEqual([{ weight: 2.5, reps: 10 }])
  })

  it('returns no warm-ups for bodyweight work', () => {
    expect(warmupPlan({ workingWeight: 80, equipment: 'bodyweight', barWeight: 20, roundTo: 2.5 })).toEqual([])
  })

  it('returns no warm-ups for a zero or negative working weight', () => {
    expect(warmupPlan({ workingWeight: 0, equipment: 'barbell', barWeight: 20, roundTo: 2.5 })).toEqual([])
    expect(warmupPlan({ workingWeight: -5, equipment: 'machine', barWeight: 20, roundTo: 2.5 })).toEqual([])
  })
})
