import type { Exercise, Session } from '../../lib/types'
import { sessionMuscleSets } from './sessionStats'

const MAX_ROWS = 6

/** "4" for whole counts, "4.5" when the secondary-muscle half-credit shows. */
function formatSets(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1)
}

/**
 * Horizontal magnitude bars: this session's working sets per muscle group.
 * Static — every value is printed, so rows read to screen readers as
 * "name value" with the bars hidden.
 */
export default function MuscleBars({
  session,
  exercises,
}: {
  session: Session
  exercises: Map<string, Exercise>
}) {
  const all = sessionMuscleSets(session, exercises)
  if (all.length === 0) return null

  const rows = all.slice(0, MAX_ROWS)
  const overflow = all.length - rows.length
  const max = rows[0].sets

  return (
    <section className="px-5 pb-5">
      <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-faint uppercase">
        Muscles
      </h2>
      <ul className="mt-2 space-y-0.5">
        {rows.map(({ muscle, sets }) => (
          <li key={muscle} className="flex items-center gap-2">
            <span className="w-[5.5rem] shrink-0 truncate text-[11px] text-dust capitalize">
              {muscle}
            </span>
            <div className="min-w-0 flex-1" aria-hidden>
              <div
                className="h-2 rounded-r bg-plate-green"
                style={{ width: `${(sets / max) * 100}%`, minWidth: '2px' }}
              />
            </div>
            <span className="numeral w-9 shrink-0 text-right text-sm text-chalk">
              {formatSets(sets)}
            </span>
          </li>
        ))}
      </ul>
      {overflow > 0 && <p className="mt-1.5 text-xs text-dust">+ {overflow} more</p>}
    </section>
  )
}
