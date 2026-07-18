import type { Exercise, Program, ProgressionState, Session, Settings } from './types'

export interface ExportBundle {
  schemaVersion: 1
  exportedAt: number
  settings: Settings
  exercises: Exercise[]
  programs: Program[]
  sessions: Session[]
  progressionState: ProgressionState[]
}

export function toJson(bundle: Omit<ExportBundle, 'schemaVersion'>): string {
  return JSON.stringify({ schemaVersion: 1, ...bundle }, null, 2)
}

/** Full-fidelity import: validates shape, throws with a readable message. */
export function parseImport(json: string): ExportBundle {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const bundle = data as Partial<ExportBundle>
  if (bundle.schemaVersion !== 1) {
    throw new Error(`Unsupported schema version ${String(bundle.schemaVersion)} — expected 1.`)
  }
  for (const key of ['settings', 'exercises', 'programs', 'sessions', 'progressionState'] as const) {
    if (bundle[key] === undefined) throw new Error(`Backup is missing "${key}".`)
  }
  return bundle as ExportBundle
}

const CSV_HEADER = [
  'date',
  'session',
  'exercise',
  'set_number',
  'is_warmup',
  'weight',
  'reps',
  'rir',
  'completed_at',
].join(',')

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** One row per logged set — every set, not just summaries. */
export function sessionsToCsv(sessions: Session[], exercises: Map<string, Exercise>): string {
  const rows = [CSV_HEADER]
  for (const session of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const date = new Date(session.startedAt).toISOString().slice(0, 10)
    for (const entry of session.entries) {
      const name = exercises.get(entry.exerciseId)?.name ?? entry.exerciseId
      entry.sets.forEach((set, i) => {
        rows.push(
          [
            date,
            csvEscape(session.name),
            csvEscape(name),
            String(i + 1),
            set.isWarmup ? 'yes' : 'no',
            String(set.weight),
            String(set.reps),
            set.rir === undefined ? '' : String(set.rir),
            new Date(set.completedAt).toISOString(),
          ].join(','),
        )
      })
    }
  }
  return rows.join('\n')
}
