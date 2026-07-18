import { db, newId } from '../db/db'
import type {
  Exercise,
  LoggedSet,
  Program,
  ProgramDay,
  Session,
  SessionEntry,
  SetTarget,
} from '../lib/types'
import { historyForExercise } from '../lib/history'
import { defaultProgression, isAnchorSession, suggestNext } from '../lib/progression'
import { isIsolation } from '../features/programs/edits'

/** The one unfinished session, if any — only one workout may run at a time. */
async function findUnfinished(): Promise<Session | undefined> {
  const all = await db.sessions.orderBy('startedAt').reverse().toArray()
  return all.find((s) => s.finishedAt === undefined)
}

/**
 * Start a session from a program day: compute an explained target for every
 * slot from history + progression state, then persist the session.
 * Returns the new session id. If a workout is already in progress, no new
 * session is created and the running session's id is returned instead — so
 * double-taps and stale start screens can never orphan a live workout.
 */
export async function startSessionFromDay(program: Program, day: ProgramDay): Promise<string> {
  return db.transaction('rw', [db.sessions, db.settings, db.progressionState], async () => {
    const existing = await findUnfinished()
    if (existing) return existing.id

    const settings = await db.settings.get('app')
    const unit = settings?.unit ?? 'lb'
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
  })
}

/** Start an empty freestyle session (or resume the one already running). */
export async function startEmptySession(): Promise<string> {
  return db.transaction('rw', db.sessions, async () => {
    const existing = await findUnfinished()
    if (existing) return existing.id
    const session: Session = {
      id: newId(),
      name: 'Freestyle workout',
      startedAt: Date.now(),
      entries: [],
    }
    await db.sessions.put(session)
    return session.id
  })
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

/** The user's programmed slot for an exercise, if one exists. */
async function programmedSlot(exerciseId: string) {
  const programs = await db.programs.orderBy('createdAt').toArray()
  for (const program of programs) {
    for (const day of program.days) {
      const slot = day.slots.find((s) => s.exerciseId === exerciseId)
      if (slot) return slot
    }
  }
  return undefined
}

/**
 * Add an ad-hoc exercise to a running session. Freestyle entries reuse the
 * exercise's programmed slot config when one exists, so the shared
 * per-exercise stall counter is always advanced under the same rules.
 */
export async function addEntry(sessionId: string, exerciseId: string): Promise<void> {
  const exercise: Exercise | undefined = await db.exercises.get(exerciseId)
  const settings = await db.settings.get('app')
  const unit = settings?.unit ?? 'lb'
  const sessions = await db.sessions.orderBy('startedAt').toArray()
  const state = await db.progressionState.get(exerciseId)
  const slot = await programmedSlot(exerciseId)
  const equipment = exercise?.equipment ?? 'machine'
  const progression =
    slot?.progression ??
    defaultProgression(equipment, unit, { isolation: exercise ? isIsolation(exercise) : false })
  const plannedSets = slot?.sets ?? 3
  const restSeconds = slot?.restSeconds ?? (equipment === 'barbell' ? 180 : 90)
  const { target } = suggestNext({
    history: historyForExercise(sessions, exerciseId),
    config: progression,
    stallCount: state?.stallCount ?? 0,
    plannedSets,
    unit,
    now: Date.now(),
  })
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) return
    session.entries.push({
      id: newId(),
      exerciseId,
      restSeconds,
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
 * counters. Returns false when nothing was logged and the session was
 * discarded instead of saved.
 *
 * Stall bookkeeping contract (shared with the engine): the stored
 * `stallCount` always means "consecutive stalls BEFORE the latest finished
 * session", which is exactly the input `suggestNext` expects at start time.
 * So on finish we evaluate history EXCLUDING the session being finished
 * (advancing the count through the previous session) — the just-finished
 * session itself is evaluated exactly once, by the next start/finish.
 */
export async function finishSession(sessionId: string): Promise<boolean> {
  const settings = await db.settings.get('app')
  const unit = settings?.unit ?? 'lb'

  return db.transaction('rw', [db.sessions, db.progressionState], async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) return false
    // Drop entries where nothing was logged; an all-empty workout leaves no
    // trace in history at all.
    session.entries = session.entries.filter((e) => e.sets.length > 0)
    if (session.entries.length === 0) {
      await db.sessions.delete(sessionId)
      return false
    }
    session.finishedAt = Date.now()
    await db.sessions.put(session)

    const sessions = await db.sessions.orderBy('startedAt').toArray()
    const priorSessions = sessions.filter((s) => s.id !== sessionId)
    const advanced = new Set<string>()
    for (const entry of session.entries) {
      if (!entry.progression || entry.progression.mode === 'manual') continue
      // Warm-up-only entries contribute no history point: nothing to count.
      if (entry.sets.every((s) => s.isWarmup)) continue
      // Advance each exercise at most once per finished session.
      if (advanced.has(entry.exerciseId)) continue
      advanced.add(entry.exerciseId)
      // A light outlier session (e.g. technique day) is skipped by the
      // engine's anchor at the next start — advancing the counter past the
      // previous session here would double-count it there.
      const fullHistory = historyForExercise(sessions, entry.exerciseId)
      if (!isAnchorSession(fullHistory, entry.progression, Date.now())) continue
      const state = await db.progressionState.get(entry.exerciseId)
      const { nextStallCount } = suggestNext({
        history: historyForExercise(priorSessions, entry.exerciseId),
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
    return true
  })
}

export async function discardSession(sessionId: string): Promise<void> {
  await db.sessions.delete(sessionId)
}

/** The target for an entry, falling back to a bare repeat of the last set. */
export function entryTarget(entry: SessionEntry): SetTarget | undefined {
  return entry.target
}
