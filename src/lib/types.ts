export type Unit = 'kg' | 'lb'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'forearms'

export interface Exercise {
  id: string
  name: string
  equipment: Equipment
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  isCustom?: boolean
}

export type ProgressionMode = 'double' | 'linear' | 'manual'

export interface ProgressionConfig {
  mode: ProgressionMode
  /** Bottom of the rep range. For linear mode, minReps === maxReps. */
  minReps: number
  maxReps: number
  /** Weight added on progression, in the app's unit. */
  increment: number
  /** Consecutive stalled sessions before a deload is suggested. */
  stallThreshold: number
  /** Fraction of weight removed on deload, e.g. 0.1. */
  deloadFraction: number
  /** RIR the lifter should have at the end of a working set (0–4). */
  targetRir: number
  /** Smallest achievable weight step (e.g. 2× smallest plate). */
  roundTo: number
}

export interface ProgramSlot {
  id: string
  exerciseId: string
  sets: number
  restSeconds: number
  progression: ProgressionConfig
  /** Slots sharing a group letter alternate as a superset block. */
  supersetGroup?: string
}

export interface ProgramDay {
  id: string
  name: string
  slots: ProgramSlot[]
}

export interface Program {
  id: string
  name: string
  description?: string
  days: ProgramDay[]
  createdAt: number
}

export interface LoggedSet {
  id: string
  weight: number
  reps: number
  /** Reps in reserve, 0–4. Only trusted by the engine in the 0–3 band. */
  rir?: number
  isWarmup: boolean
  completedAt: number
}

export type TargetKind = 'start' | 'increase' | 'hold' | 'deload' | 'repeat'

export interface SetTarget {
  weight: number
  repsLow: number
  repsHigh: number
  sets: number
  kind: TargetKind
  /** One-sentence, user-facing reason for this suggestion. */
  explanation: string
}

export interface SessionEntry {
  id: string
  exerciseId: string
  slotId?: string
  supersetGroup?: string
  restSeconds: number
  target?: SetTarget
  progression?: ProgressionConfig
  sets: LoggedSet[]
  note?: string
}

export interface Session {
  id: string
  programId?: string
  dayId?: string
  name: string
  startedAt: number
  finishedAt?: number
  entries: SessionEntry[]
}

export interface ProgressionState {
  exerciseId: string
  stallCount: number
  updatedAt: number
}

export interface VolumeBand {
  low: number
  high: number
}

export interface Settings {
  id: 'app'
  unit: Unit
  barWeight: number
  /** Plates available per side, in the app's unit. */
  plates: number[]
  /** Per-muscle weekly working-set guideline bands (editable). */
  volumeBands: Partial<Record<MuscleGroup, VolumeBand>>
  restTimerSound: boolean
  /** When the user last downloaded a JSON backup; drives the backup nudge. */
  lastBackupAt?: number
}

/** A past session's working sets for one exercise, as fed to the engine. */
export interface WorkingSet {
  weight: number
  reps: number
  rir?: number
}

export interface HistoryPoint {
  date: number
  sets: WorkingSet[]
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'forearms',
]

export const DEFAULT_VOLUME_BANDS: Record<MuscleGroup, VolumeBand> = {
  chest: { low: 10, high: 20 },
  back: { low: 10, high: 20 },
  shoulders: { low: 8, high: 18 },
  biceps: { low: 8, high: 16 },
  triceps: { low: 8, high: 16 },
  quads: { low: 8, high: 18 },
  hamstrings: { low: 6, high: 16 },
  glutes: { low: 6, high: 16 },
  calves: { low: 6, high: 14 },
  abs: { low: 6, high: 14 },
  forearms: { low: 0, high: 10 },
}
