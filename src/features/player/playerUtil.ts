import type { LoggedSet, SessionEntry } from '../../lib/types'
import { epley } from '../../lib/e1rm'

/** Working (non-warm-up) sets of an entry, in log order. */
export function workingSets(entry: SessionEntry): LoggedSet[] {
  return entry.sets.filter((s) => !s.isWarmup)
}

/** Warm-up sets of an entry, in log order. */
export function warmupSets(entry: SessionEntry): LoggedSet[] {
  return entry.sets.filter((s) => s.isWarmup)
}

/** How many working-set tickets to render: planned sets, or more if over-logged. */
export function rowCount(entry: SessionEntry): number {
  return Math.max(entry.target?.sets ?? 3, workingSets(entry).length)
}

/** Prefill weight: last logged working weight, else the engine target. */
export function prefillWeight(entry: SessionEntry): number {
  const logged = workingSets(entry)
  if (logged.length > 0) return logged[logged.length - 1].weight
  return entry.target?.weight ?? 0
}

/** Prefill reps: top of the target rep range. */
export function prefillReps(entry: SessionEntry): number {
  return entry.target?.repsHigh ?? entry.progression?.maxReps ?? 8
}

export type EntryBlock =
  | { kind: 'single'; entry: SessionEntry }
  | { kind: 'superset'; group: string; entries: SessionEntry[] }

/** Group consecutive entries sharing a supersetGroup into one block. */
export function blocksOf(entries: SessionEntry[]): EntryBlock[] {
  const blocks: EntryBlock[] = []
  let i = 0
  while (i < entries.length) {
    const entry = entries[i]
    const group = entry.supersetGroup
    if (group !== undefined) {
      let j = i + 1
      while (j < entries.length && entries[j].supersetGroup === group) j++
      if (j - i > 1) {
        blocks.push({ kind: 'superset', group, entries: entries.slice(i, j) })
        i = j
        continue
      }
    }
    blocks.push({ kind: 'single', entry })
    i++
  }
  return blocks
}

export interface DisplayRow {
  entry: SessionEntry
  setIndex: number
}

/** Superset ordering: A1, B1, A2, B2, … */
export function interleavedRows(entries: SessionEntry[]): DisplayRow[] {
  const rows: DisplayRow[] = []
  const max = entries.reduce((m, e) => Math.max(m, rowCount(e)), 0)
  for (let i = 0; i < max; i++) {
    for (const entry of entries) {
      if (i < rowCount(entry)) rows.push({ entry, setIndex: i })
    }
  }
  return rows
}

/** Every working-set ticket in on-screen order. */
export function orderedRows(entries: SessionEntry[]): DisplayRow[] {
  return blocksOf(entries).flatMap((b) =>
    b.kind === 'single'
      ? Array.from({ length: rowCount(b.entry) }, (_, i) => ({ entry: b.entry, setIndex: i }))
      : interleavedRows(b.entries),
  )
}

/** The next unlogged working set, in on-screen order. */
export function nextUnloggedRow(entries: SessionEntry[]): DisplayRow | undefined {
  return orderedRows(entries).find((r) => workingSets(r.entry)[r.setIndex] === undefined)
}

/**
 * PR flags per working set: a set is a PR when its e1RM beats both the
 * historical best and every earlier set this session. No history → no PRs.
 */
export function prFlags(sets: LoggedSet[], baseline: number): boolean[] {
  let best = baseline
  return sets.map((s) => {
    const e = epley(s.weight, s.reps)
    const isPr = baseline > 0 && e > best
    if (e > best) best = e
    return isPr
  })
}

export interface SessionStats {
  sets: number
  volume: number
  prCount: number
}

export function sessionStats(
  entries: SessionEntry[],
  baselines: Map<string, number>,
): SessionStats {
  let sets = 0
  let volume = 0
  let prCount = 0
  for (const entry of entries) {
    const ws = workingSets(entry)
    sets += ws.length
    for (const s of ws) volume += s.weight * s.reps
    prCount += prFlags(ws, baselines.get(entry.exerciseId) ?? 0).filter(Boolean).length
  }
  return { sets, volume, prCount }
}

/** m:ss clock (minutes are unbounded, so 75:09 is valid). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
