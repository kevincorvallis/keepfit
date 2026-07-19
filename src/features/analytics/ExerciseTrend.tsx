import { useEffect, useRef, useState } from 'react'
import type { Exercise, Session, Unit, WorkingSet } from '../../lib/types'
import { bestE1rm, e1rmSeries, epley } from '../../lib/e1rm'
import { historyForExercise } from '../../lib/history'
import { formatWeight } from '../../lib/plates'
import { bestSetFor, mostTrainedExercises, shortDate } from './trainingData'
import { useOutsideTap } from './useOutsideTap'

/** e1RM trend for the most-trained exercises: chips → time-scaled chart + best + recents. */
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
        Exercise trend <span className="text-dust">· e1RM, {unit}</span>
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

/** A session's e1RM plus the top set behind it. */
interface TrendPoint {
  date: number
  e1rm: number
  weight: number
  reps: number
}

function topSetOf(sets: WorkingSet[]): WorkingSet {
  let top = sets[0]
  for (const s of sets) {
    if (epley(s.weight, s.reps) > epley(top.weight, top.reps)) top = s
  }
  return top
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

  const topByDate = new Map(history.map((h) => [h.date, topSetOf(h.sets)]))
  const points: TrendPoint[] = series.map((p) => {
    const top = topByDate.get(p.date)
    return { date: p.date, e1rm: p.e1rm, weight: top?.weight ?? 0, reps: top?.reps ?? 0 }
  })

  const recent = [...history].slice(-5).reverse()

  return (
    <div className="mt-3 rounded-card border border-line bg-surface p-4">
      {points.length > 1 && <TrendChart points={points} unit={unit} />}
      <div
        className={`${points.length > 1 ? 'mt-4' : ''} flex items-end justify-between gap-3`}
      >
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
          const topSet = topSetOf(point.sets)
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

const CHART_H = 160
const PLOT = { top: 16, right: 12, bottom: 18, left: 34 }

function niceStep(raw: number): number {
  const r = Math.max(raw, 1)
  const pow = 10 ** Math.floor(Math.log10(r))
  for (const m of [1, 2, 5]) {
    if (m * pow >= r) return m * pow
  }
  return 10 * pow
}

/** ≤4 whole-number gridline values inside [lo, hi]. */
function ticksFor(lo: number, hi: number): number[] {
  let step = niceStep((hi - lo) / 4)
  for (;;) {
    const ticks: number[] = []
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t)
    if (ticks.length <= 4) return ticks
    step = niceStep(step + 1)
  }
}

/**
 * Time-scaled e1RM chart: x = date, y = e1RM padded ~3% beyond the data range.
 * A transparent button per point makes every reading tappable and reachable
 * by assistive tech; tapping selects the nearest point and shows a tooltip.
 */
function TrendChart({ points, unit }: { points: TrendPoint[]; unit: Unit }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  // Guard against the series shrinking while a point is selected.
  const sel = picked !== null && picked < points.length ? picked : null
  useOutsideTap(wrapRef, sel !== null, () => setPicked(null))

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const x0 = PLOT.left
  const x1 = width - PLOT.right
  const yTop = PLOT.top
  const yBottom = CHART_H - PLOT.bottom

  const first = points[0]
  const last = points[points.length - 1]
  const dateSpan = last.date - first.date
  const xFor = (date: number) =>
    dateSpan > 0 ? x0 + ((date - first.date) / dateSpan) * (x1 - x0) : (x0 + x1) / 2

  const values = points.map((p) => p.e1rm)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const pad = maxV > minV ? (maxV - minV) * 0.03 : Math.max(1, maxV * 0.03)
  const lo = minV - pad
  const hi = maxV + pad
  const yFor = (v: number) => yBottom - ((v - lo) / (hi - lo)) * (yBottom - yTop)

  const xs = points.map((p) => xFor(p.date))
  const ys = points.map((p) => yFor(p.e1rm))
  const ticks = ticksFor(lo, hi)

  const lineD = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(' ')
  const areaD = `${lineD} L ${xs[xs.length - 1].toFixed(1)} ${yBottom} L ${xs[0].toFixed(1)} ${yBottom} Z`

  const lastX = xs[xs.length - 1]
  const lastY = ys[ys.length - 1]
  const calloutY = Math.max(lastY - 10, 13)

  return (
    <div ref={wrapRef} className="relative" style={{ height: CHART_H }}>
      {width > 0 && (
        <>
          <svg width={width} height={CHART_H} aria-hidden="true">
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={x0}
                  x2={x1}
                  y1={yFor(t)}
                  y2={yFor(t)}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                />
                <text
                  x={x0 - 6}
                  y={yFor(t) + 3.5}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--color-dust)"
                  className="numeral"
                >
                  {t}
                </text>
              </g>
            ))}
            <text
              x={x0}
              y={CHART_H - 4}
              fontSize="11"
              fill="var(--color-dust)"
              className="numeral"
            >
              {shortDate(first.date)}
            </text>
            <text
              x={x1}
              y={CHART_H - 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--color-dust)"
              className="numeral"
            >
              {shortDate(last.date)}
            </text>
            <path d={areaD} fill="var(--color-chalk)" fillOpacity="0.05" />
            <path
              d={lineD}
              fill="none"
              stroke="var(--color-chalk)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {sel !== null && sel !== points.length - 1 && (
              <circle
                cx={xs[sel]}
                cy={ys[sel]}
                r="4"
                fill="var(--color-chalk)"
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            )}
            <circle cx={lastX} cy={lastY} r="7" fill="var(--color-surface)" />
            <circle cx={lastX} cy={lastY} r="5" fill="var(--color-plate-red)" />
            <text
              x={lastX - 10}
              y={calloutY}
              textAnchor="end"
              fontSize="13"
              fontWeight="600"
              fill="var(--color-chalk)"
              className="numeral"
            >
              {Math.round(last.e1rm)}
            </text>
          </svg>
          {points.map((p, i) => {
            const left = i === 0 ? 0 : (xs[i - 1] + xs[i]) / 2
            const right = i === points.length - 1 ? width : (xs[i] + xs[i + 1]) / 2
            return (
              <button
                key={i}
                onClick={() => setPicked(sel === i ? null : i)}
                aria-pressed={sel === i}
                aria-label={`${shortDate(p.date)} — e1RM ${Math.round(p.e1rm)} ${unit}, top set ${formatWeight(p.weight, unit)} × ${p.reps}`}
                className="absolute top-0 bottom-0"
                style={{ left, width: right - left }}
              />
            )
          })}
          {sel !== null && (
            <TrendTooltip point={points[sel]} x={xs[sel]} y={ys[sel]} width={width} unit={unit} />
          )}
        </>
      )}
    </div>
  )
}

function TrendTooltip({
  point,
  x,
  y,
  width,
  unit,
}: {
  point: TrendPoint
  x: number
  y: number
  width: number
  unit: Unit
}) {
  const anchorX = Math.min(Math.max(x, 80), width - 80)
  const above = y >= 64
  return (
    <div
      className="pointer-events-none absolute z-10 w-max rounded-md border border-line bg-raised px-2.5 py-1.5"
      style={{
        left: anchorX,
        top: above ? y - 12 : y + 12,
        transform: above ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      }}
    >
      <p className="text-[11px] text-dust">{shortDate(point.date)}</p>
      <p className="text-sm">
        <span className="numeral font-semibold text-chalk">{Math.round(point.e1rm)}</span>{' '}
        <span className="text-[11px] text-dust">e1RM</span>
      </p>
      <p className="numeral text-[11px] text-dust">
        {formatWeight(point.weight, unit)} × {point.reps}
      </p>
    </div>
  )
}
