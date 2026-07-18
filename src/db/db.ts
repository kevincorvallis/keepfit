import Dexie, { type Table } from 'dexie'
import type { Exercise, Program, ProgressionState, Session, Settings } from '../lib/types'
import { seedExercises, seedPrograms, defaultSettings } from './seed'

export class ApogeeDB extends Dexie {
  exercises!: Table<Exercise, string>
  programs!: Table<Program, string>
  sessions!: Table<Session, string>
  progressionState!: Table<ProgressionState, string>
  settings!: Table<Settings, string>

  constructor() {
    super('apogee')
    this.version(1).stores({
      exercises: 'id, name, equipment',
      programs: 'id, name, createdAt',
      sessions: 'id, startedAt, programId, finishedAt',
      progressionState: 'exerciseId',
      settings: 'id',
    })
  }
}

export const db = new ApogeeDB()

/** Idempotent first-run seed: exercise catalog, templates, settings. */
export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', [db.exercises, db.programs, db.settings], async () => {
    if ((await db.settings.get('app')) === undefined) {
      await db.settings.put(defaultSettings())
    }
    if ((await db.exercises.count()) === 0) {
      await db.exercises.bulkPut(seedExercises())
    }
    if ((await db.programs.count()) === 0) {
      // Seed program increments in whatever unit the app is running in.
      const unit = (await db.settings.get('app'))?.unit ?? 'lb'
      await db.programs.bulkPut(seedPrograms(unit))
    }
  })
}

export function newId(): string {
  return crypto.randomUUID()
}
