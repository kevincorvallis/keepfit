import { db, newId } from '../db/db'
import type {
  LoggedSet,
  Program,
  ProgramDay,
  Session,
  SessionEntry,
  SetTarget,
} from '../lib/types'
import { historyForExercise } from '../lib/history'
import { suggestNext } from '../lib/progression'

/**
 * Start a session from a program day: compute an explained target for every
 * slot from history + progression state, then persist the session.
 * Returns the new session id.
 */
export async function startSessionFromDay(program: Program, day: ProgramDay): Promise<string> {
  const settings = await db.settings.get('app')
  const unit = settings?.unit ?? 'kg'
  const sessions = await db.sessions.orderBy('startedAt').toArray()
  const now = Date.now()

  const entries: SessionEntry[] = []
  for (const slot of day.slots) {
    const state = await db.progressionState.get(slot.exerciseId)
    const { target } = suggestNext({
      history: historyForExercise(sessions, slot.exerciseId),
      config: slot.progression,
      stallCount: state?.stallCount ?? 0,
      plannedSets: slot.sets,
      unit,
      now,
    })
    entries.push({
      id: newId(),
      exerciseId: slot.exerciseId,
      slotId: slot.id,
      supersetGroup: slot.supersetGroup,
      restSeconds: slot.restSeconds,
      target,
      progression: slot.progression,
      sets: [],
    })
  }

  const session: Session = {
    id: newId(),
    programId: program.id,
    dayId: day.id,
    name: `${program.name} — ${day.name}`,
    startedAt: now,
    entries,
  }
  await db.sessions.put(session)
  return session.id
}

/** Start an empty freestyle session. */
export async function startEmptySession(): Promise<string> {
  const session: Session = {
    id: newId(),
    name: 'Freestyle workout',
    startedAt: Date.now(),
    entries: [],
  }
  await db.sessions.put(session)
  return session.id
}

/** Persist one logged set. Transactional: a crash loses at most this set. */
export async function logSet(
  sessionId: string,
  entryId: string,
  set: Omit<LoggedSet, 'id' | 'completedAt'>,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) return
    const entry = session.entries.find((e) => e.id === entryId)
    if (!entry) return
    entry.sets.push({ ...set, id: newId(), completedAt: Date.now() })
    await db.sessions.put(session)
  })
}

export async function updateSet(
  sessionId: string,
  entryId: string,
  setId: string,
  patch: Partial<Pick<LoggedSet, 'weight' | 'reps' | 'rir' | 'isWarmup'>>,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    const entry = session?.entries.find((e) => e.id === entryId)
    const set = entry?.sets.find((s) => s.id === setId)
    if (!session || !set) return
    Object.assign(set, patch)
    await db.sessions.put(session)
  })
}

export async function removeSet(sessionId: string, entryId: string, setId: string): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    const entry = session?.entries.find((e) => e.id === entryId)
    if (!session || !entry) return
    entry.sets = entry.sets.filter((s) => s.id !== setId)
    await db.sessions.put(session)
  })
}

/** Add an ad-hoc exercise to a running session. */
export async function addEntry(sessionId: string, exerciseId: string): Promise<void> {
  const exercise = await db.exercises.get(exerciseId)
  const settings = await db.settings.get('app')
  const unit = settings?.unit ?? 'kg'
  const sessions = await db.sessions.orderBy('startedAt').toArray()
  const state = await db.progressionState.get(exerciseId)
  const { defaultProgression } = await import('../lib/progression')
  const progression = defaultProgression(exercise?.equipment ?? 'machine', unit)
  const { target } = suggestNext({
    history: historyForExercise(sessions, exerciseId),
    config: progression,
    stallCount: state?.stallCount ?? 0,
    plannedSets: 3,
    unit,
    now: Date.now(),
  })
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) return
    session.entries.push({
      id: newId(),
      exerciseId,
      restSeconds: 120,
      target,
      progression,
      sets: [],
    })
    await db.sessions.put(session)
  })
}

export async function removeEntry(sessionId: string, entryId: string): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) return
    session.entries = session.entries.filter((e) => e.id !== entryId)
    await db.sessions.put(session)
  })
}

/**
 * Finish a session: stamp finishedAt, then advance per-exercise stall
 * counters by re-running the engine over history including this session.
 */
export async function finishSession(sessionId: string): Promise<void> {
  const settings = await db.settings.get('app')
  const unit = settings?.unit ?? 'kg'

  await db.transaction('rw', [db.sessions, db.progressionState], async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) return
    // Drop entries where nothing was logged.
    session.entries = session.entries.filter((e) => e.sets.length > 0)
    session.finishedAt = Date.now()
    await db.sessions.put(session)

    const sessions = await db.sessions.orderBy('startedAt').toArray()
    for (const entry of session.entries) {
      if (!entry.progression || entry.progression.mode === 'manual') continue
      const state = await db.progressionState.get(entry.exerciseId)
      const { nextStallCount } = suggestNext({
        history: historyForExercise(sessions, entry.exerciseId),
        config: entry.progression,
        stallCount: state?.stallCount ?? 0,
        plannedSets: entry.target?.sets ?? entry.sets.length,
        unit,
        now: Date.now(),
      })
      await db.progressionState.put({
        exerciseId: entry.exerciseId,
        stallCount: nextStallCount,
        updatedAt: Date.now(),
      })
    }
  })
}

export async function discardSession(sessionId: string): Promise<void> {
  await db.sessions.delete(sessionId)
}

/** The target for an entry, falling back to a bare repeat of the last set. */
export function entryTarget(entry: SessionEntry): SetTarget | undefined {
  return entry.target
}
