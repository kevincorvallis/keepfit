import type { HistoryPoint, ProgressionConfig, SetTarget, Unit, WorkingSet } from './types'
import { formatWeight, roundToStep } from './plates'

export interface SuggestArgs {
  /** Past sessions for this exercise, ascending by date, working sets only. */
  history: HistoryPoint[]
  config: ProgressionConfig
  stallCount: number
  plannedSets: number
  unit: Unit
  now: number
}

export interface SuggestResult {
  target: SetTarget
  nextStallCount: number
}

const DAY = 86_400_000

/**
 * Pure, total progression engine: (history, config) → explained target.
 * Never throws — malformed history degrades to a "repeat" suggestion.
 */
export function suggestNext(args: SuggestArgs): SuggestResult {
  const { config, unit, now, plannedSets } = args
  const history = (args.history ?? [])
    .filter((h) => h.sets.length > 0)
    .sort((a, b) => a.date - b.date)
  const stallCount = Math.max(0, args.stallCount ?? 0)

  if (history.length === 0) {
    return {
      target: {
        weight: 0,
        repsLow: config.minReps,
        repsHigh: config.maxReps,
        sets: plannedSets,
        kind: 'start',
        explanation: `First session — pick a weight you could lift for about ${config.maxReps} reps with ${config.targetRir} in reserve.`,
      },
      nextStallCount: 0,
    }
  }

  const last = history[history.length - 1]
  const lastWeight = topWeight(last.sets)
  const lastSets = last.sets.filter((s) => s.weight === lastWeight)

  if (config.mode === 'manual') {
    return {
      target: {
        weight: lastWeight,
        repsLow: config.minReps,
        repsHigh: config.maxReps,
        sets: plannedSets,
        kind: 'repeat',
        explanation: 'Auto-progression is off — repeating your last session.',
      },
      nextStallCount: stallCount,
    }
  }

  // Long layoff: ease back in rather than suggesting a PR attempt.
  const daysSince = (now - last.date) / DAY
  if (daysSince > 14) {
    const weeksOff = Math.ceil((daysSince - 14) / 7)
    const reduction = Math.min(0.25, 0.05 * weeksOff)
    const weight = roundToStep(lastWeight * (1 - reduction), config.roundTo, 'down')
    return {
      target: {
        weight,
        repsLow: config.minReps,
        repsHigh: config.maxReps,
        sets: plannedSets,
        kind: 'repeat',
        explanation: `It's been ${Math.round(daysSince / 7)} weeks since you trained this — easing back ${Math.round(reduction * 100)}% to rebuild.`,
      },
      nextStallCount: 0,
    }
  }

  return config.mode === 'linear'
    ? linear(lastSets, lastWeight, stallCount, config, unit, plannedSets)
    : double(history, lastSets, lastWeight, stallCount, config, unit, plannedSets)
}

function linear(
  lastSets: WorkingSet[],
  lastWeight: number,
  stallCount: number,
  config: ProgressionConfig,
  unit: Unit,
  plannedSets: number,
): SuggestResult {
  const target = config.maxReps
  const allHit = lastSets.every((s) => s.reps >= target)

  if (allHit) {
    const weight = roundToStep(lastWeight + config.increment, config.roundTo)
    return result(
      weight,
      config,
      plannedSets,
      'increase',
      `+${formatWeight(config.increment, unit)} because you hit all ${lastSets.length}×${target} last session.`,
      0,
    )
  }

  if (stallCount + 1 >= config.stallThreshold) {
    const weight = deloadWeight(lastWeight, config)
    return result(
      weight,
      config,
      plannedSets,
      'deload',
      `−${formatWeight(lastWeight - weight, unit)} deload to rebuild momentum after ${config.stallThreshold} stalled sessions.`,
      0,
    )
  }

  return result(
    lastWeight,
    config,
    plannedSets,
    'hold',
    `Keep the weight and try to hit all ${plannedSets}×${target} today.`,
    stallCount + 1,
  )
}

function double(
  history: HistoryPoint[],
  lastSets: WorkingSet[],
  lastWeight: number,
  stallCount: number,
  config: ProgressionConfig,
  unit: Unit,
  plannedSets: number,
): SuggestResult {
  const allMaxed = lastSets.every((s) => s.reps >= config.maxReps)
  const anyBelowMin = lastSets.some((s) => s.reps < config.minReps)
  const totalReps = lastSets.reduce((a, s) => a + s.reps, 0)

  // RIR is only trusted near failure (0–3 band, Remmert/Zourdos 2023).
  const rirSets = lastSets.filter((s) => s.rir !== undefined && s.rir >= 0 && s.rir <= 4)
  const avgRir = rirSets.length >= Math.ceil(lastSets.length / 2)
    ? rirSets.reduce((a, s) => a + (s.rir ?? 0), 0) / rirSets.length
    : undefined

  if (allMaxed) {
    // Grinding at RIR 0 with a higher target: earn the increment first.
    if (avgRir !== undefined && avgRir === 0 && config.targetRir >= 2) {
      return result(
        lastWeight,
        config,
        plannedSets,
        'hold',
        `Hold the weight — you hit ${config.maxReps}s but at RIR 0 (target ${config.targetRir}); make them cleaner first.`,
        0,
      )
    }
    const overshoot = avgRir !== undefined && avgRir > config.targetRir + 1
    const inc = overshoot ? config.increment * 2 : config.increment
    const weight = roundToStep(lastWeight + inc, config.roundTo)
    return result(
      weight,
      config,
      plannedSets,
      'increase',
      overshoot
        ? `+${formatWeight(inc, unit)} because you hit ${config.maxReps} reps with ~${Math.round(avgRir)} still in the tank.`
        : `+${formatWeight(inc, unit)} because you hit ${config.maxReps} reps on all sets last session.`,
      0,
    )
  }

  if (anyBelowMin) {
    // Stopped early with plenty in reserve — not a true stall.
    const stoppedEarly = lastSets
      .filter((s) => s.reps < config.minReps)
      .every((s) => s.rir !== undefined && s.rir >= 2)
    if (stoppedEarly) {
      return result(
        lastWeight,
        config,
        plannedSets,
        'hold',
        `Keep the weight — you stopped short of ${config.minReps} reps with reps in reserve.`,
        stallCount,
      )
    }
    if (stallCount + 1 >= config.stallThreshold) {
      const weight = deloadWeight(lastWeight, config)
      return result(
        weight,
        config,
        plannedSets,
        'deload',
        `−${formatWeight(lastWeight - weight, unit)} deload because progress stalled ${config.stallThreshold} sessions running.`,
        0,
      )
    }
    return result(
      lastWeight,
      config,
      plannedSets,
      'hold',
      `Keep the weight and focus on reaching at least ${config.minReps} reps per set.`,
      stallCount + 1,
    )
  }

  // In range: did we add reps versus the last session at this weight?
  const prevTotal = previousTotalAtWeight(history, lastWeight)
  const addedReps = prevTotal === undefined || totalReps > prevTotal

  if (!addedReps) {
    if (stallCount + 1 >= config.stallThreshold) {
      const weight = deloadWeight(lastWeight, config)
      return result(
        weight,
        config,
        plannedSets,
        'deload',
        `−${formatWeight(lastWeight - weight, unit)} deload because reps have been flat for ${config.stallThreshold} sessions.`,
        0,
      )
    }
    return result(
      lastWeight,
      config,
      plannedSets,
      'hold',
      'You matched last session — push for at least one more rep today.',
      stallCount + 1,
    )
  }

  return result(
    lastWeight,
    config,
    plannedSets,
    'hold',
    `Keep the weight and chase ${config.maxReps} reps on every set.`,
    0,
  )
}

function previousTotalAtWeight(history: HistoryPoint[], weight: number): number | undefined {
  for (let i = history.length - 2; i >= 0; i--) {
    const sets = history[i].sets.filter((s) => s.weight === weight)
    if (sets.length > 0) return sets.reduce((a, s) => a + s.reps, 0)
  }
  return undefined
}

function deloadWeight(weight: number, config: ProgressionConfig): number {
  const target = weight * (1 - config.deloadFraction)
  const rounded = roundToStep(target, config.roundTo, 'down')
  // Guarantee the deload actually removes weight.
  return rounded >= weight ? roundToStep(weight - config.roundTo, config.roundTo, 'down') : rounded
}

function topWeight(sets: WorkingSet[]): number {
  return sets.reduce((max, s) => Math.max(max, s.weight), 0)
}

function result(
  weight: number,
  config: ProgressionConfig,
  sets: number,
  kind: SetTarget['kind'],
  explanation: string,
  nextStallCount: number,
): SuggestResult {
  return {
    target: {
      weight: Math.max(0, weight),
      repsLow: config.minReps,
      repsHigh: config.maxReps,
      sets,
      kind,
      explanation,
    },
    nextStallCount,
  }
}

/** Evidence-based defaults by equipment (see design doc). */
export function defaultProgression(
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight',
  unit: Unit,
  opts?: { mode?: 'double' | 'linear'; isolation?: boolean },
): ProgressionConfig {
  const kg = unit === 'kg'
  const base = {
    mode: opts?.mode ?? 'double',
    stallThreshold: equipment === 'barbell' ? 2 : 3,
    deloadFraction: 0.1,
    targetRir: 2,
  } as const

  if (equipment === 'barbell') {
    return {
      ...base,
      minReps: opts?.mode === 'linear' ? 5 : 5,
      maxReps: opts?.mode === 'linear' ? 5 : 8,
      increment: kg ? 2.5 : 5,
      roundTo: kg ? 2.5 : 5,
    }
  }
  if (equipment === 'dumbbell') {
    return { ...base, minReps: 8, maxReps: 12, increment: kg ? 2 : 5, roundTo: kg ? 2 : 5 }
  }
  if (equipment === 'bodyweight') {
    return { ...base, minReps: 8, maxReps: 15, increment: kg ? 2.5 : 5, roundTo: kg ? 2.5 : 5 }
  }
  // machine / cable
  if (opts?.isolation) {
    return { ...base, minReps: 12, maxReps: 20, increment: kg ? 1.25 : 2.5, roundTo: kg ? 1.25 : 2.5 }
  }
  return { ...base, minReps: 10, maxReps: 15, increment: kg ? 2.5 : 5, roundTo: kg ? 2.5 : 5 }
}
