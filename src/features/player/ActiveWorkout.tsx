import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EllipsisVertical, Plus } from 'lucide-react'
import { Button, Sheet } from '../../app/ui'
import { useExerciseMap, useExercises, useFinishedSessions, useSettings } from '../../state/hooks'
import {
  addEntry,
  discardSession,
  finishSession,
  logSet,
  removeEntry,
  removeSet,
  updateSet,
} from '../../state/workout'
import { historyForExercise } from '../../lib/history'
import { bestE1rm } from '../../lib/e1rm'
import { defaultBarWeight, defaultPlates } from '../../lib/plates'
import type { Session, SessionEntry } from '../../lib/types'
import { AddExerciseSheet } from './AddExerciseSheet'
import { AdjustSheet } from './AdjustSheet'
import { EntryBlockCard, type PlayerCtx } from './EntryCard'
import { FinishSheet } from './FinishSheet'
import { RestTimerBar, type NextSetPreview } from './RestTimerBar'
import {
  blocksOf,
  formatClock,
  nextUnloggedRow,
  prefillReps,
  prefillWeight,
  sessionStats,
  workingSets,
} from './playerUtil'
import { primeAudio } from './sound'

const NOTIFY_ASKED_KEY = 'keepfit:notification-asked'

interface RestTimer {
  endsAt: number
  total: number
}

/** The live workout player: entry cards, one-tap tickets, rest timer. */
export default function ActiveWorkout({ session }: { session: Session }) {
  const navigate = useNavigate()
  const settings = useSettings()
  const finished = useFinishedSessions()
  const exerciseMap = useExerciseMap()
  const exercises = useExercises()

  const unit = settings?.unit ?? 'kg'
  const barWeight = settings?.barWeight ?? defaultBarWeight(unit)
  const plates = settings?.plates ?? defaultPlates(unit)
  const soundOn = settings?.restTimerSound ?? true

  // Elapsed clock.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsedSeconds = Math.max(0, Math.floor((now - session.startedAt) / 1000))

  // Ask for notification permission once, the first time a session runs.
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    try {
      if (localStorage.getItem(NOTIFY_ASKED_KEY)) return
      localStorage.setItem(NOTIFY_ASKED_KEY, '1')
    } catch {
      return
    }
    void Notification.requestPermission()
  }, [])

  const [timer, setTimer] = useState<RestTimer | null>(null)
  const [adjust, setAdjust] = useState<{
    entryId: string
    setIndex: number
    draftWeight?: number
  } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Best historical e1RM per exercise (finished sessions only) → PR stamps.
  const baselines = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of session.entries) {
      if (map.has(entry.exerciseId)) continue
      const history = historyForExercise(finished, entry.exerciseId)
      map.set(entry.exerciseId, bestE1rm(history.flatMap((h) => h.sets)))
    }
    return map
  }, [finished, session.entries])

  const blocks = useMemo(() => blocksOf(session.entries), [session.entries])
  const next = useMemo(() => nextUnloggedRow(session.entries), [session.entries])
  const nextPreview: NextSetPreview | undefined = useMemo(() => {
    if (!next) return undefined
    const exercise = exerciseMap.get(next.entry.exerciseId)
    return {
      name: exercise?.name ?? 'Next set',
      weight: prefillWeight(next.entry),
      barbell: exercise?.equipment === 'barbell',
    }
  }, [next, exerciseMap])

  const logLock = useRef(false)
  async function handleLogWorking(entry: SessionEntry, weight: number, reps: number, rir?: number) {
    if (logLock.current) return
    logLock.current = true
    try {
      if (soundOn) primeAudio()
      await logSet(session.id, entry.id, { weight, reps, rir, isWarmup: false })
      setTimer({ endsAt: Date.now() + entry.restSeconds * 1000, total: entry.restSeconds })
    } finally {
      logLock.current = false
    }
  }

  function adjustTimer(deltaSeconds: number) {
    setTimer((t) => {
      if (!t) return t
      const endsAt = t.endsAt + deltaSeconds * 1000
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      return { endsAt, total: Math.max(t.total, remaining) }
    })
  }

  async function handleFinish() {
    if (busy) return
    setBusy(true)
    try {
      await finishSession(session.id)
      navigate(`/history/${session.id}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDiscard() {
    if (busy) return
    setBusy(true)
    try {
      setDiscardOpen(false)
      await discardSession(session.id)
    } finally {
      setBusy(false)
    }
  }

  const ctx: PlayerCtx = {
    exerciseMap,
    unit,
    barWeight,
    plates,
    baselines,
    onLogWorking: (entry, weight, reps) => {
      void handleLogWorking(entry, weight, reps)
    },
    onLogWarmup: (entry, weight, reps) => {
      void logSet(session.id, entry.id, { weight, reps, isWarmup: true })
    },
    onUndoWarmup: (entry, set) => {
      void removeSet(session.id, entry.id, set.id)
    },
    onOpenAdjust: (entry, setIndex, draftWeight) =>
      setAdjust({ entryId: entry.id, setIndex, draftWeight }),
    onRemoveEntry: (entryId) => {
      void removeEntry(session.id, entryId)
    },
  }

  const stats = sessionStats(session.entries, baselines)

  const adjustEntry = adjust ? session.entries.find((e) => e.id === adjust.entryId) : undefined
  const adjustLogged =
    adjust && adjustEntry ? workingSets(adjustEntry)[adjust.setIndex] : undefined

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-line bg-ink/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-bold uppercase">{session.name}</h1>
            <p className="numeral text-lg text-dust">{formatClock(elapsedSeconds)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="primary" onClick={() => setFinishOpen(true)}>
              Finish
            </Button>
            <button
              type="button"
              onClick={() => setDiscardOpen(true)}
              aria-label="Workout options"
              className="flex h-12 w-12 items-center justify-center rounded-card text-dust active:text-chalk"
            >
              <EllipsisVertical size={20} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className={`space-y-3 px-4 pt-4 ${timer ? 'pb-40' : 'pb-4'}`}>
        {blocks.map((block) => (
          <EntryBlockCard
            key={block.kind === 'single' ? block.entry.id : block.entries[0].id}
            block={block}
            ctx={ctx}
          />
        ))}
        {session.entries.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-dust">
            No exercises yet — add one below to start logging.
          </p>
        )}
        <Button variant="ghost" className="w-full" onClick={() => setAddOpen(true)}>
          <Plus size={18} aria-hidden /> Add exercise
        </Button>
      </div>

      {timer && (
        <RestTimerBar
          endsAt={timer.endsAt}
          total={timer.total}
          next={nextPreview}
          unit={unit}
          barWeight={barWeight}
          plates={plates}
          soundOn={soundOn}
          onAdjust={adjustTimer}
          onSkip={() => setTimer(null)}
        />
      )}

      {adjust && adjustEntry && (
        <AdjustSheet
          key={`${adjust.entryId}:${adjust.setIndex}:${adjustLogged?.id ?? 'new'}`}
          title={`${exerciseMap.get(adjustEntry.exerciseId)?.name ?? 'Set'} · set ${adjust.setIndex + 1}`}
          unit={unit}
          weightStep={adjustEntry.progression?.roundTo ?? (unit === 'kg' ? 2.5 : 5)}
          initialWeight={adjustLogged?.weight ?? adjust.draftWeight ?? prefillWeight(adjustEntry)}
          initialReps={adjustLogged?.reps ?? prefillReps(adjustEntry)}
          initialRir={adjustLogged?.rir}
          logged={adjustLogged !== undefined}
          onClose={() => setAdjust(null)}
          onLog={(weight, reps, rir) => {
            void handleLogWorking(adjustEntry, weight, reps, rir)
            setAdjust(null)
          }}
          onSave={(weight, reps, rir) => {
            if (adjustLogged) {
              void updateSet(session.id, adjustEntry.id, adjustLogged.id, { weight, reps, rir })
            }
            setAdjust(null)
          }}
          onDelete={() => {
            if (adjustLogged) {
              void removeSet(session.id, adjustEntry.id, adjustLogged.id)
            }
            setAdjust(null)
          }}
        />
      )}

      {addOpen && (
        <AddExerciseSheet
          exercises={exercises}
          onClose={() => setAddOpen(false)}
          onPick={(exerciseId) => {
            void addEntry(session.id, exerciseId)
            setAddOpen(false)
          }}
        />
      )}

      {finishOpen && (
        <FinishSheet
          durationSeconds={elapsedSeconds}
          sets={stats.sets}
          volume={stats.volume}
          prCount={stats.prCount}
          unit={unit}
          busy={busy}
          onFinish={() => {
            void handleFinish()
          }}
          onClose={() => setFinishOpen(false)}
        />
      )}

      <Sheet open={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard workout">
        <p className="text-sm text-dust">
          This deletes the workout and every set you logged in it. It can't be undone.
        </p>
        <div className="mt-5 space-y-2">
          <Button
            variant="danger"
            className="min-h-12 w-full"
            disabled={busy}
            onClick={() => {
              void handleDiscard()
            }}
          >
            Discard workout
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setDiscardOpen(false)}>
            Keep training
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
