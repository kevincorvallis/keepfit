import { useState } from 'react'
import type { Exercise, Session, Unit } from '../../lib/types'
import type { E1rmPoint } from '../../lib/e1rm'
import { bestE1rm, e1rmSeries, epley } from '../../lib/e1rm'
import { historyForExercise } from '../../lib/history'
import { formatWeight } from '../../lib/plates'
import { bestSetFor, mostTrainedExercises, shortDate } from './trainingData'

/** e1RM trend for the most-trained exercises: chips → sparkline + best + recents. */
export function ExerciseTrend({
  sessions,
  exercises,
  unit,
}: {
  sessions: Session[]
  exercises: Map<string, Exercise>
  unit: Unit
}) {
  const top = mostTrainedExercises(sessions, exercises, 8)
  const [picked, setPicked] = useState<string>()
  const selectedId = picked !== undefined && top.includes(picked) ? picked : top[0]

  if (selectedId === undefined) return null

  return (
    <section>
      <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-faint uppercase">
        Exercise trend
      </h2>
      <div className="-mx-5 mt-3 overflow-x-auto px-5">
        <div className="flex w-max gap-2">
          {top.map((id) => {
            const selected = id === selectedId
            return (
              <button
                key={id}
                onClick={() => setPicked(id)}
                aria-pressed={selected}
                className={`min-h-12 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  selected
                    ? 'border-chalk/60 bg-raised text-chalk'
                    : 'border-line bg-surface text-dust'
                }`}
              >
                {exercises.get(id)?.name ?? 'Unknown exercise'}
              </button>
            )
          })}
        </div>
      </div>
      <TrendDetail key={selectedId} sessions={sessions} exerciseId={selectedId} unit={unit} />
    </section>
  )
}

function TrendDetail({
  sessions,
  exerciseId,
  unit,
}: {
  sessions: Session[]
  exerciseId: string
  unit: Unit
}) {
  const history = historyForExercise(sessions, exerciseId)
  const series = e1rmSeries(history)
  const best = bestSetFor(sessions, exerciseId)

  if (best === undefined || series.length === 0) {
    return (
      <p className="mt-4 text-sm text-dust">
        No weighted sets logged for this exercise yet, so there is no e1RM trend to show.
      </p>
    )
  }

  const recent = [...history].slice(-5).reverse()

  return (
    <div className="mt-3 rounded-card border border-line bg-surface p-4">
      <Sparkline points={series} />
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-xs font-semibold tracking-wider text-faint uppercase">
            Best e1RM
          </p>
          <p className="numeral font-display text-5xl font-bold">
            {Math.round(best.e1rm)}
            <span className="ml-1.5 text-lg font-semibold text-dust">{unit}</span>
          </p>
        </div>
        <p className="text-right text-sm text-dust">
          <span className="numeral">
            {formatWeight(best.weight, unit)} × {best.reps}
          </span>
          <br />
          {shortDate(best.date)}
        </p>
      </div>
      <div className="mt-4 border-t border-line">
        {recent.map((point) => {
          let topSet = point.sets[0]
          for (const s of point.sets) {
            if (epley(s.weight, s.reps) > epley(topSet.weight, topSet.reps)) topSet = s
          }
          return (
            <div
              key={point.date}
              className="flex items-center justify-between gap-3 border-b border-line/60 py-2.5 text-sm last:border-b-0"
            >
              <span className="w-16 shrink-0 text-dust">{shortDate(point.date)}</span>
              <span className="numeral flex-1 text-right text-dust">
                {formatWeight(topSet.weight, unit)} × {topSet.reps}
              </span>
              <span className="numeral w-14 shrink-0 text-right font-semibold">
                {Math.round(bestE1rm(point.sets))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Bare polyline sparkline — no axes, chalk stroke, plate-red dot on the latest point. */
function Sparkline({ points }: { points: E1rmPoint[] }) {
  const w = 320
  const h = 64
  const pad = 6

  const min = Math.min(...points.map((p) => p.e1rm))
  const max = Math.max(...points.map((p) => p.e1rm))

  const xFor = (i: number) =>
    points.length === 1 ? w - pad : pad + (i / (points.length - 1)) * (w - 2 * pad)
  const yFor = (e1rm: number) => {
    const t = max > min ? (e1rm - min) / (max - min) : 0.5
    return h - pad - t * (h - 2 * pad)
  }

  const coords = points.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.e1rm).toFixed(1)}`)
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label={`Estimated 1RM trend across ${points.length} session${points.length === 1 ? '' : 's'}`}
    >
      {points.length > 1 && (
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="var(--color-chalk)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle
        cx={xFor(points.length - 1)}
        cy={yFor(last.e1rm)}
        r="3.5"
        fill="var(--color-plate-red)"
      />
    </svg>
  )
}
