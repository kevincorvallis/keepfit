import { Fragment } from 'react'
import type { Exercise, MuscleGroup, Session, Settings, VolumeBand } from '../../lib/types'
import { DEFAULT_VOLUME_BANDS, MUSCLE_GROUPS } from '../../lib/types'
import { weekStartOf, weeklyVolume } from '../../lib/volume'

const WEEK = 7 * 86_400_000
const WEEKS_SHOWN = 8

const IN_BAND_LOW = 25
const IN_BAND_HIGH = 45
const ABOVE_BAND = 35

function greenMix(pct: number): string {
  return `color-mix(in oklab, var(--color-plate-green) ${pct}%, var(--color-surface))`
}

const yellowMix = `color-mix(in oklab, var(--color-plate-yellow) ${ABOVE_BAND}%, var(--color-surface))`

function formatCount(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1)
}

function weekLabel(weekStart: number): string {
  const d = new Date(weekStart)
  return `${d.getDate()}.${d.getMonth() + 1}`
}

/** Weekly working-set heat grid: muscles × last 8 weeks, colored vs bands. */
export function VolumeHeatGrid({
  sessions,
  exercises,
  volumeBands,
}: {
  sessions: Session[]
  exercises: Map<string, Exercise>
  volumeBands: Settings['volumeBands']
}) {
  const byWeek = new Map(weeklyVolume(sessions, exercises).map((w) => [w.weekStart, w.perMuscle]))

  const now = Date.now()
  const weekStarts: number[] = []
  for (let k = WEEKS_SHOWN - 1; k >= 0; k--) weekStarts.push(weekStartOf(now - k * WEEK))

  const muscles = MUSCLE_GROUPS.filter((m) =>
    weekStarts.some((w) => (byWeek.get(w)?.[m] ?? 0) > 0),
  )

  return (
    <section>
      <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-faint uppercase">
        Weekly volume
      </h2>
      {muscles.length === 0 ? (
        <p className="mt-3 text-sm text-dust">No working sets in the last 8 weeks.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-[3.75rem_repeat(8,minmax(0,1fr))] gap-1">
            <div aria-hidden />
            {weekStarts.map((w) => (
              <div key={w} className="numeral pb-0.5 text-center text-[10px] text-faint">
                {weekLabel(w)}
              </div>
            ))}
            {muscles.map((m) => (
              <Fragment key={m}>
                <div className="flex items-center truncate text-[11px] text-dust capitalize">
                  {m}
                </div>
                {weekStarts.map((w) => (
                  <Cell
                    key={w}
                    muscle={m}
                    value={byWeek.get(w)?.[m] ?? 0}
                    band={volumeBands[m] ?? DEFAULT_VOLUME_BANDS[m]}
                  />
                ))}
              </Fragment>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-dust">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-raised" aria-hidden />
              below
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs" style={{ background: greenMix(35) }} aria-hidden />
              in range
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs" style={{ background: yellowMix }} aria-hidden />
              above
            </span>
          </div>
        </>
      )}
      <p className="mt-2 text-xs text-faint">
        Working sets per muscle per week. Bands are your editable starting points, not
        prescriptions — adjust them in Settings.
      </p>
    </section>
  )
}

function Cell({
  muscle,
  value,
  band,
}: {
  muscle: MuscleGroup
  value: number
  band: VolumeBand
}) {
  const base = 'numeral flex h-8 items-center justify-center rounded-sm text-[11px]'
  if (value <= 0) return <div className={`${base} bg-surface`} aria-hidden />

  const label = formatCount(value)
  const title = `${muscle}: ${label} sets`

  if (value < band.low) {
    return (
      <div className={`${base} bg-raised text-faint`} title={title}>
        {label}
      </div>
    )
  }
  if (value <= band.high) {
    const span = band.high - band.low
    const t = span > 0 ? (value - band.low) / span : 1
    const pct = Math.round(IN_BAND_LOW + (IN_BAND_HIGH - IN_BAND_LOW) * t)
    return (
      <div className={`${base} text-chalk`} style={{ background: greenMix(pct) }} title={title}>
        {label}
      </div>
    )
  }
  return (
    <div className={`${base} text-chalk`} style={{ background: yellowMix }} title={title}>
      {label}
    </div>
  )
}
