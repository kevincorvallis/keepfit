import { useEffect, useRef, useState } from 'react'
import { PlateBar } from '../../app/PlateBar'
import { formatWeight } from '../../lib/plates'
import type { Unit } from '../../lib/types'
import { formatClock } from './playerUtil'
import { playBeep } from './sound'

export interface NextSetPreview {
  name: string
  weight: number
  barbell: boolean
}

/**
 * Rest countdown docked above the tab bar. Driven by an endsAt timestamp
 * plus a 500 ms tick and a visibilitychange recompute, so backgrounding
 * the PWA never drifts it. At zero: vibration, an optional notification,
 * an optional WebAudio beep, and the bar turns plate-green "Go".
 */
export function RestTimerBar({
  endsAt,
  total,
  next,
  unit,
  barWeight,
  plates,
  soundOn,
  onAdjust,
  onSkip,
}: {
  endsAt: number
  total: number
  next?: NextSetPreview
  unit: Unit
  barWeight: number
  plates: number[]
  soundOn: boolean
  onAdjust: (deltaSeconds: number) => void
  onSkip: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    const onVisibility = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const done = remaining === 0
  const fraction = done ? 1 : total > 0 ? Math.min(1, remaining / total) : 0

  const nextLabel = next ? `${next.name} ${formatWeight(next.weight, unit)}` : undefined
  const firedFor = useRef<number | null>(null)
  useEffect(() => {
    if (!done || firedFor.current === endsAt) return
    firedFor.current = endsAt
    navigator.vibrate?.([200, 100, 200])
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(nextLabel ? `Rest done — ${nextLabel}` : 'Rest done')
      } catch {
        // Some platforms only allow notifications via a service worker.
      }
    }
    if (soundOn) playBeep()
  }, [done, endsAt, nextLabel, soundOn])

  const adjustButton =
    'numeral flex h-12 min-w-12 items-center justify-center rounded-lg border border-line px-2 text-sm font-semibold text-dust select-none active:text-chalk'

  return (
    <div
      className="fixed inset-x-0 z-20"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-lg px-3 pb-2">
        <div
          className={`rounded-card border p-3 shadow-lg ${
            done ? 'border-plate-green/60 bg-surface' : 'border-line bg-raised'
          }`}
        >
          {/* Screen-reader announcement when rest ends — the visual flip to
              "Go" is otherwise silent (role=timer is intentionally not live). */}
          <span role="status" className="sr-only">
            {done ? (nextLabel ? `Rest done — next up ${nextLabel}` : 'Rest done') : ''}
          </span>
          <div className="flex items-center gap-3">
            <span
              role="timer"
              className={`numeral font-display text-4xl font-bold ${done ? 'text-plate-green uppercase' : ''}`}
            >
              {done ? 'Go' : formatClock(remaining)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAdjust(-15)}
                aria-label="Shorten rest by 15 seconds"
                className={adjustButton}
              >
                −15
              </button>
              <button
                type="button"
                onClick={() => onAdjust(15)}
                aria-label="Extend rest by 15 seconds"
                className={adjustButton}
              >
                +15
              </button>
              <button
                type="button"
                onClick={onSkip}
                aria-label="Skip rest"
                className="flex h-12 items-center justify-center rounded-lg px-3 text-sm font-semibold text-dust select-none active:text-chalk"
              >
                Skip
              </button>
            </div>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
            <div
              className={`h-full ${done ? 'bg-plate-green' : 'bg-plate-blue'}`}
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
          {next && (
            <div className="mt-2">
              <p className="text-xs text-dust">
                Next up · <span className="text-dust">{next.name}</span>
                {next.weight > 0 && (
                  <>
                    {' · '}
                    <span className="numeral text-chalk">{formatWeight(next.weight, unit)}</span>
                  </>
                )}
              </p>
              {next.barbell && next.weight > barWeight && (
                <div className="mt-1">
                  <PlateBar
                    compact
                    targetWeight={next.weight}
                    barWeight={barWeight}
                    plates={plates}
                    unit={unit}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
