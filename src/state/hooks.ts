import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise } from '../lib/types'

export function useSettings() {
  return useLiveQuery(() => db.settings.get('app'))
}

export function useExercises() {
  return useLiveQuery(() => db.exercises.orderBy('name').toArray()) ?? []
}

export function useExerciseMap(): Map<string, Exercise> {
  const exercises = useExercises()
  return new Map(exercises.map((e) => [e.id, e]))
}

/** All programs — undefined while the initial query is still loading. */
export function usePrograms() {
  return useLiveQuery(() => db.programs.orderBy('createdAt').toArray())
}

/** Finished sessions ascending — undefined while still loading. */
export function useFinishedSessions() {
  return useLiveQuery(() =>
    db.sessions
      .orderBy('startedAt')
      .toArray()
      .then((all) => all.filter((s) => s.finishedAt !== undefined)),
  )
}

/**
 * The one unfinished session, if a workout is in progress.
 * undefined = still loading, null = no active workout — callers must not
 * treat the loading state as "no workout" (that flashes the start screen).
 */
export function useActiveSession() {
  return useLiveQuery(() =>
    db.sessions
      .orderBy('startedAt')
      .reverse()
      .toArray()
      .then((all) => all.find((s) => s.finishedAt === undefined) ?? null),
  )
}
