import { useRef, useState, type CSSProperties } from 'react'
import type { Session } from '../../lib/types'
import { weekStartOf } from '../../lib/volume'
import { useOutsideTap } from './useOutsideTap'

const WEEK = 7 * 86_400_000
const WEEKS_SHOWN = 13 // 12 full weeks + the current one
const CELL = 12
const GAP = 2
const STEP = CELL + GAP
const GUTTER = 18 // weekday-hint column, including its gap
const MONTH_H = 16 // month-label row above the grid
const GRID_W = GUTTER + WEEKS_SHOWN * STEP - GAP
const GRID_H = MONTH_H + 7 * STEP - GAP

/** Sequential green ramp for working sets: 1–3 / 4–7 / 8–11 / 12+. */
const RAMP = ['#2d533b', '#38724d', '#429060', '#4cae73']

function rampColor(sets: number): string {
  if (sets >= 12) return RAMP[3]
  if (sets >= 8) return RAMP[2]
  if (sets >= 4) return RAMP[1]
  return RAMP[0]
}

function dayStartOf(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function workingSetCount(session: Session): number {
  let n = 0
  for (const entry of session.entries) {
    for (const s of entry.sets) if (!s.isWarmup && s.reps > 0) n++
  }
  return n
}

function dayLabel(ts: number): string {
  const d = new Date(ts)
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' })
  const monthDay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${weekday} ${monthDay}`
}

interface DayCell {
  date: number
  sets: number
  col: number
  row: number
}

/** GitHub-style training calendar: last 13 weeks, Mon→Sun, colored by working sets. */
export function ConsistencyCalendar({ sessions }: { sessions: Session[] }) {
  const [selected, setSelected] = useState<DayCell | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  useOutsideTap(wrapRef, selected !== null, () => setSelected(null))

  const setsByDay = new Map<number, number>()
  for (const session of sessions) {
    if (session.finishedAt === undefined) continue
    const n = workingSetCount(session)
    if (n === 0) continue
    const day = dayStartOf(session.startedAt)
    setsByDay.set(day, (setsByDay.get(day) ?? 0) + n)
  }

  const now = Date.now()
  const today = dayStartOf(now)
  const weekStarts: number[] = []
  for (let k = WEEKS_SHOWN - 1; k >= 0; k--) weekStarts.push(weekStartOf(now - k * WEEK))

  // Columns of 7 local-midnight timestamps; null for days after today.
  const columns = weekStarts.map((weekStart) =>
    Array.from({ length: 7 }, (_, row) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + row)
      const ts = d.getTime()
      return ts <= today ? ts : null
    }),
  )

  const monthLabels = weekStarts.flatMap((w, col) => {
    if (col === 0) return []
    const d = new Date(w)
    if (d.getMonth() === new Date(weekStarts[col - 1]).getMonth()) return []
    return [{ col, text: d.toLocaleDateString(undefined, { month: 'short' }) }]
  })

  // Summary over the displayed window.
  let sessionCount = 0
  let totalSets = 0
  for (const session of sessions) {
    if (session.finishedAt === undefined || session.startedAt < weekStarts[0]) continue
    const n = workingSetCount(session)
    if (n === 0) continue
    sessionCount++
    totalSets += n
  }

  return (
    <section>
      <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-faint uppercase">
        Consistency
      </h2>
      <div ref={wrapRef} className="relative mt-3" style={{ width: GRID_W }}>
        <div className="relative" style={{ height: MONTH_H }} aria-hidden>
          {monthLabels.map(({ col, text }) => (
            <span
              key={col}
              className="absolute top-0 text-[10px] leading-none text-dust"
              style={{ left: GUTTER + col * STEP }}
            >
              {text}
            </span>
          ))}
        </div>
        <div className="flex">
          <div className="flex flex-col gap-0.5" style={{ width: GUTTER }} aria-hidden>
            {['M', '', 'W', '', 'F', '', ''].map((hint, row) => (
              <span key={row} className="h-3 text-[10px] leading-3 text-dust">
                {hint}
              </span>
            ))}
          </div>
          <div className="flex gap-0.5">
            {columns.map((days, col) => (
              <div key={weekStarts[col]} className="flex flex-col gap-0.5">
                {days.map((ts, row) => {
                  if (ts === null) return <div key={row} className="h-3 w-3" />
                  const sets = setsByDay.get(ts) ?? 0
                  const isSelected = selected?.date === ts
                  return (
                    <button
                      key={row}
                      onClick={() =>
                        setSelected(isSelected ? null : { date: ts, sets, col, row })
                      }
                      aria-pressed={isSelected}
                      aria-label={`${dayLabel(ts)} — ${
                        sets > 0 ? `${sets} working set${sets === 1 ? '' : 's'}` : 'no training'
                      }`}
                      className={`h-3 w-3 rounded-[3px] ${
                        sets === 0 ? 'border border-line/60 bg-surface' : ''
                      }`}
                      style={sets > 0 ? { background: rampColor(sets) } : undefined}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        {selected !== null && <CellTooltip cell={selected} />}
      </div>
      <div
        className="mt-2 flex items-center justify-end gap-1 text-[10px] text-dust"
        style={{ width: GRID_W }}
      >
        <span className="mr-0.5">less</span>
        {RAMP.map((color) => (
          <span key={color} className="h-3 w-3 rounded-[3px]" style={{ background: color }} aria-hidden />
        ))}
        <span className="ml-0.5">more</span>
      </div>
      <p className="mt-2 text-xs text-dust">
        <span className="numeral">{sessionCount}</span> session{sessionCount === 1 ? '' : 's'} ·{' '}
        <span className="numeral">{totalSets}</span> working set{totalSets === 1 ? '' : 's'} in the
        last 12 weeks.
      </p>
    </section>
  )
}

function CellTooltip({ cell }: { cell: DayCell }) {
  const x = GUTTER + cell.col * STEP
  const y = MONTH_H + cell.row * STEP
  const pos: CSSProperties = {}
  if (cell.col <= 6) pos.left = x
  else pos.right = GRID_W - (x + CELL)
  if (cell.row <= 2) pos.top = y + CELL + 4
  else pos.bottom = GRID_H - y + 4

  return (
    <div
      className="pointer-events-none absolute z-10 w-max rounded-md border border-line bg-raised px-2.5 py-1.5"
      style={pos}
    >
      <p className="text-[11px] text-dust">{dayLabel(cell.date)}</p>
      {cell.sets > 0 ? (
        <p className="text-sm">
          <span className="numeral font-semibold text-chalk">{cell.sets}</span>{' '}
          <span className="text-dust">working set{cell.sets === 1 ? '' : 's'}</span>
        </p>
      ) : (
        <p className="text-sm text-dust">No training</p>
      )}
    </div>
  )
}
