import { Link } from 'react-router-dom'
import type { Session, Unit } from '../../lib/types'
import { EmptyState, PageHeader } from '../../app/ui'
import { useFinishedSessions, useSettings } from '../../state/hooks'
import {
  formatDuration,
  formatVolume,
  prCountBySession,
  sessionVolume,
  workingSetCount,
} from './sessionStats'

interface MonthGroup {
  label: string
  sessions: Session[]
}

function groupByMonth(sessions: Session[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const session of sessions) {
    const label = new Date(session.startedAt).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.sessions.push(session)
    else groups.push({ label, sessions: [session] })
  }
  return groups
}

export default function HistoryPage() {
  const sessions = useFinishedSessions()
  const unit = useSettings()?.unit ?? 'kg'

  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt)
  const prCounts = prCountBySession(sessions)

  return (
    <div>
      <PageHeader sub="Log" title="History" />
      {ordered.length === 0 ? (
        <EmptyState title="No workouts yet" body="Start your first session from the Train tab." />
      ) : (
        <div className="space-y-6 px-5">
          {groupByMonth(ordered).map((group) => (
            <section key={group.label}>
              <h2 className="font-display px-1 pb-2 text-sm font-semibold tracking-[0.14em] text-faint uppercase">
                {group.label}
              </h2>
              <ul className="space-y-2">
                {group.sessions.map((session) => (
                  <li key={session.id}>
                    <SessionCard
                      session={session}
                      unit={unit}
                      prCount={prCounts.get(session.id) ?? 0}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({
  session,
  unit,
  prCount,
}: {
  session: Session
  unit: Unit
  prCount: number
}) {
  const date = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const duration = formatDuration(session.startedAt, session.finishedAt ?? session.startedAt)
  const sets = workingSetCount(session)
  const volume = sessionVolume(session)

  return (
    <Link
      to={`/history/${session.id}`}
      className="block rounded-card border border-line bg-surface p-4 transition-colors active:bg-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{session.name}</p>
          <p className="mt-0.5 text-sm text-dust">{date}</p>
        </div>
        {prCount > 0 && (
          <span className="numeral shrink-0 rounded-full border border-plate-red/40 px-2.5 py-1 text-sm font-semibold text-plate-red">
            {prCount} PR{prCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="numeral mt-3 text-sm text-dust">
        {duration} · {sets} set{sets === 1 ? '' : 's'} · {formatVolume(volume, unit)}
      </p>
    </Link>
  )
}
