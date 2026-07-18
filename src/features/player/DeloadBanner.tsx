import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { assessFatigue, type ExerciseFatigueInput } from '../../lib/deload'
import { historyForExercise } from '../../lib/history'
import { useExerciseMap, useFinishedSessions, usePrograms } from '../../state/hooks'

const DISMISS_KEY = 'keepfit:deload-dismissed'
const DAY = 86_400_000

/**
 * Trend-triggered deload suggestion on the start screen. Dismissal lives in
 * sessionStorage only — it comes back next visit if the signals persist.
 */
export function DeloadBanner() {
  const finished = useFinishedSessions()
  const programs = usePrograms()
  const exerciseMap = useExerciseMap()
  const progressionStates = useLiveQuery(() => db.progressionState.toArray()) ?? []
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  const assessment = useMemo(() => {
    const cutoff = Date.now() - 28 * DAY
    const trainedIds = new Set<string>()
    for (const session of finished) {
      if (session.startedAt < cutoff) continue
      for (const entry of session.entries) {
        if (entry.sets.some((s) => !s.isWarmup)) trainedIds.add(entry.exerciseId)
      }
    }

    let recentProgram
    for (let i = finished.length - 1; i >= 0; i--) {
      const programId = finished[i].programId
      if (programId === undefined) continue
      recentProgram = programs.find((p) => p.id === programId)
      if (recentProgram) break
    }
    const slots = recentProgram?.days.flatMap((d) => d.slots) ?? []
    const stallCounts = new Map(progressionStates.map((s) => [s.exerciseId, s.stallCount]))

    const inputs: ExerciseFatigueInput[] = [...trainedIds].map((id) => {
      const exercise = exerciseMap.get(id)
      const slot = slots.find((s) => s.exerciseId === id)
      return {
        name: exercise?.name ?? 'Unknown exercise',
        history: historyForExercise(finished, id),
        stallCount: stallCounts.get(id) ?? 0,
        stallThreshold:
          slot?.progression.stallThreshold ?? (exercise?.equipment === 'barbell' ? 2 : 3),
      }
    })
    return assessFatigue(inputs)
  }, [finished, programs, progressionStates, exerciseMap])

  if (dismissed || !assessment.suggestDeload) return null

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Session-only nicety; losing it is fine.
    }
    setDismissed(true)
  }

  return (
    <div className="mx-5 mb-4 rounded-card border border-plate-yellow/40 bg-plate-yellow/10 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold text-plate-yellow uppercase">
          Consider a deload
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss deload suggestion"
          className="-mt-2 -mr-2 flex h-12 w-12 shrink-0 items-center justify-center text-dust active:text-chalk"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      <ul className="mt-1 space-y-1 text-sm text-dust">
        {assessment.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  )
}
