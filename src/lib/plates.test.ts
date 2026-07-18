import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLATES_KG,
  DEFAULT_PLATES_LB,
  defaultBarWeight,
  defaultPlates,
  formatPlates,
  formatWeight,
  plateLoadout,
  roundToStep,
  smallestBarbellStep,
} from './plates'

describe('roundToStep', () => {
  it('rounds to the nearest step by default', () => {
    expect(roundToStep(101.3, 2.5)).toBe(102.5)
    expect(roundToStep(101.2, 2.5)).toBe(100)
    expect(roundToStep(100, 2.5)).toBe(100)
  })

  it('cleans float dust instead of returning 61.350000000000001', () => {
    expect(roundToStep(61.35, 1.25)).toBe(61.25)
    expect(roundToStep(0.1 + 0.2, 0.05)).toBe(0.3)
  })

  it('rounds down without disturbing exact multiples', () => {
    expect(roundToStep(101, 2.5, 'down')).toBe(100)
    expect(roundToStep(97.5, 2.5, 'down')).toBe(97.5)
    // 0.1 + 0.2 scaled: dust just above a multiple must not drop a whole step
    expect(roundToStep((0.1 + 0.2) * 100, 7.5, 'down')).toBe(30)
  })

  it('rounds up without disturbing exact multiples', () => {
    expect(roundToStep(101, 2.5, 'up')).toBe(102.5)
    expect(roundToStep(100, 2.5, 'up')).toBe(100)
  })

  it('returns the weight unchanged for a non-positive step', () => {
    expect(roundToStep(101.3, 0)).toBe(101.3)
    expect(roundToStep(101.3, -2.5)).toBe(101.3)
  })
})

describe('smallestBarbellStep', () => {
  it('is twice the smallest plate', () => {
    expect(smallestBarbellStep(DEFAULT_PLATES_KG)).toBe(2.5)
    expect(smallestBarbellStep([25, 20, 15, 10, 5])).toBe(10)
  })

  it('falls back to 2.5 with no plates', () => {
    expect(smallestBarbellStep([])).toBe(2.5)
  })
})

describe('plateLoadout', () => {
  it('loads 100 kg on a 20 kg bar as 25 + 15 per side', () => {
    const loadout = plateLoadout(100, 20, DEFAULT_PLATES_KG)
    expect(loadout.perSide).toEqual([25, 15])
    expect(loadout.achieved).toBe(100)
    expect(loadout.exact).toBe(true)
  })

  it('uses micro plates for 102.5 kg', () => {
    const loadout = plateLoadout(102.5, 20, DEFAULT_PLATES_KG)
    expect(loadout.perSide).toEqual([25, 15, 1.25])
    expect(loadout.achieved).toBe(102.5)
    expect(loadout.exact).toBe(true)
  })

  it('repeats plates for heavy loads (180 kg → 3×25 + 5 per side)', () => {
    const loadout = plateLoadout(180, 20, DEFAULT_PLATES_KG)
    expect(loadout.perSide).toEqual([25, 25, 25, 5])
    expect(loadout.exact).toBe(true)
  })

  it('loads two plates for 225 lb on a 45 lb bar', () => {
    const loadout = plateLoadout(225, 45, DEFAULT_PLATES_LB)
    expect(loadout.perSide).toEqual([45, 45])
    expect(loadout.achieved).toBe(225)
    expect(loadout.exact).toBe(true)
  })

  it('gets as close as possible from below when the target is unloadable', () => {
    const loadout = plateLoadout(101, 20, DEFAULT_PLATES_KG)
    expect(loadout.perSide).toEqual([25, 15])
    expect(loadout.achieved).toBe(100)
    expect(loadout.exact).toBe(false)
  })

  it('returns an empty bar when the target equals the bar', () => {
    const loadout = plateLoadout(20, 20, DEFAULT_PLATES_KG)
    expect(loadout.perSide).toEqual([])
    expect(loadout.achieved).toBe(20)
    expect(loadout.exact).toBe(true)
  })

  it('returns the bare bar (inexact) when the target is below the bar', () => {
    const loadout = plateLoadout(15, 20, DEFAULT_PLATES_KG)
    expect(loadout.perSide).toEqual([])
    expect(loadout.achieved).toBe(20)
    expect(loadout.exact).toBe(false)
  })
})

describe('formatPlates', () => {
  it('says "empty bar" for no plates', () => {
    expect(formatPlates([])).toBe('empty bar')
  })

  it('lists single plates plainly', () => {
    expect(formatPlates([25, 15])).toBe('25 + 15')
  })

  it('collapses repeats into counts', () => {
    expect(formatPlates([25, 25, 25, 5])).toBe('3×25 + 5')
    expect(formatPlates([20, 20, 10])).toBe('2×20 + 10')
  })
})

describe('formatWeight', () => {
  it('drops the decimals on whole numbers', () => {
    expect(formatWeight(100, 'kg')).toBe('100 kg')
    expect(formatWeight(45, 'lb')).toBe('45 lb')
  })

  it('keeps meaningful decimals, capped at two places', () => {
    expect(formatWeight(102.5, 'kg')).toBe('102.5 kg')
    expect(formatWeight(116.66666666666667, 'kg')).toBe('116.67 kg')
  })
})

describe('defaults', () => {
  it('per-unit plates and bar weights', () => {
    expect(defaultPlates('kg')).toEqual(DEFAULT_PLATES_KG)
    expect(defaultPlates('lb')).toEqual(DEFAULT_PLATES_LB)
    expect(defaultBarWeight('kg')).toBe(20)
    expect(defaultBarWeight('lb')).toBe(45)
  })
})
