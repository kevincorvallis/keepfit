import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft } from 'lucide-react'
import { db } from '../../db/db'
import { Button, EmptyState, Sheet } from '../../app/ui'
import { useExerciseMap, useSettings } from '../../state/hooks'
import type { SessionEntry, Unit } from '../../lib/types'
import { epley } from '../../lib/e1rm'
import { formatDuration } from './sessionStats'
import MuscleBars from './MuscleBars'

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return rounded % 1 === 0 ? rounded.toFixed(0) : String(rounded)
}

export default function SessionDetailPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const unit = useSettings()?.unit ?? 'lb'
  const exercises = useExerciseMap()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // undefined while loading, null when the session does not exist.
  const session = useLiveQuery(async () => {
    if (!sessionId) return null
    return (await db.sessions.get(sessionId)) ?? null
  }, [sessionId])

  if (session === undefined || deleting) return null

  if (session === null) {
    return (
      <div>
        <BackLink />
        <EmptyState
          title="Session not found"
          body="This session may have been deleted. Head back to your log."
          action={
            <Button variant="secondary" onClick={() => navigate('/history')}>
              Back to history
            </Button>
          }
        />
      </div>
    )
  }

  const date = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  async function handleDelete() {
    if (!sessionId) return
    setDeleting(true)
    await db.sessions.delete(sessionId)
    navigate('/history')
  }

  return (
    <div>
      <BackLink />
      <header className="px-5 pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight uppercase">{session.name}</h1>
        <p className="numeral mt-1 text-sm text-dust">
          {date}
          {session.finishedAt !== undefined &&
            ` · ${formatDuration(session.startedAt, session.finishedAt)}`}
        </p>
      </header>

      <MuscleBars session={session} exercises={exercises} />

      <div className="space-y-3 px-5">
        {session.entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            name={exercises.get(entry.exerciseId)?.name ?? 'Unknown exercise'}
            unit={unit}
          />
        ))}
      </div>

      <div className="px-5 pt-6">
        <Button variant="danger" big onClick={() => setConfirming(true)}>
          Delete session
        </Button>
      </div>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title="Delete session">
        <p className="text-sm text-dust">
          This removes the session from your log permanently. Future suggestions are computed
          from your remaining log, so they may change.
        </p>
        <div className="mt-5 grid gap-3">
          <Button variant="danger" big onClick={handleDelete}>
            Delete session
          </Button>
          <Button variant="secondary" big onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function BackLink() {
  return (
    <div className="px-5 pt-4">
      <Link
        to="/history"
        className="-ml-3 inline-flex min-h-12 items-center gap-1.5 px-3 text-sm font-medium text-dust active:text-chalk"
      >
        <ArrowLeft size={18} aria-hidden />
        History
      </Link>
    </div>
  )
}

function EntryCard({ entry, name, unit }: { entry: SessionEntry; name: string; unit: Unit }) {
  // The best working set's e1RM gets the highlight.
  let bestSetId: string | undefined
  let bestE1rm = 0
  for (const set of entry.sets) {
    if (set.isWarmup) continue
    const e1rm = epley(set.weight, set.reps)
    if (e1rm > bestE1rm) {
      bestE1rm = e1rm
      bestSetId = set.id
    }
  }

  let workingIndex = 0
  const rows = entry.sets.map((set) => ({
    set,
    label: set.isWarmup ? 'W' : String(++workingIndex),
    e1rm: epley(set.weight, set.reps),
  }))

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <h2 className="font-semibold">{name}</h2>
      {entry.target?.explanation && (
        <p className="mt-0.5 text-sm text-dust italic">{entry.target.explanation}</p>
      )}
      <table className="numeral mt-3 w-full text-sm">
        <thead>
          <tr className="font-display text-xs tracking-wider text-faint uppercase">
            <th className="pb-1.5 text-left font-semibold">Set</th>
            <th className="pb-1.5 text-right font-semibold">{unit}</th>
            <th className="pb-1.5 text-right font-semibold">Reps</th>
            <th className="pb-1.5 text-right font-semibold">RIR</th>
            <th className="pb-1.5 text-right font-semibold">e1RM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ set, label, e1rm }) => (
            <tr
              key={set.id}
              className={`border-t border-line/60 ${set.isWarmup ? 'text-dust' : ''}`}
            >
              <td className="py-1.5 text-left">{label}</td>
              <td className="py-1.5 text-right">{formatNumber(set.weight)}</td>
              <td className="py-1.5 text-right">{set.reps}</td>
              <td className="py-1.5 text-right">{set.rir ?? '—'}</td>
              <td
                className={`py-1.5 text-right ${
                  set.isWarmup ? '' : set.id === bestSetId ? 'font-semibold text-chalk' : 'text-dust'
                }`}
              >
                {e1rm > 0 ? Math.round(e1rm) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entry.note && <p className="mt-2 text-sm text-dust">{entry.note}</p>}
    </section>
  )
}
