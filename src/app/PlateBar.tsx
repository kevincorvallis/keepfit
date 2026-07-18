import { formatPlates, formatWeight, plateLoadout } from '../lib/plates'
import type { Unit } from '../lib/types'

/** IPF competition colors (kg) and a parallel scale for lb plates. */
const KG_COLORS: Record<number, string> = {
  25: 'var(--color-plate-red)',
  20: 'var(--color-plate-blue)',
  15: 'var(--color-plate-yellow)',
  10: 'var(--color-plate-green)',
  5: 'var(--color-plate-white)',
  2.5: '#8a3f3a',
  1.25: '#8c8577',
}
const LB_COLORS: Record<number, string> = {
  45: 'var(--color-plate-blue)',
  35: 'var(--color-plate-yellow)',
  25: 'var(--color-plate-green)',
  10: 'var(--color-plate-white)',
  5: '#8a3f3a',
  2.5: '#8c8577',
}

function plateColor(p: number, unit: Unit): string {
  return (unit === 'kg' ? KG_COLORS : LB_COLORS)[p] ?? '#6e675c'
}

function plateHeight(p: number, unit: Unit): number {
  const full = unit === 'kg' ? 15 : 35 // smallest full-diameter plate
  if (p >= full) return 64
  const min = 22
  const max = 52
  const scale = p / full
  return Math.round(min + (max - min) * scale)
}

/**
 * The signature element: a to-scale barbell loadout in competition plate
 * colors. Reads left sleeve only — lifters mirror it on the other side.
 */
export function PlateBar({
  targetWeight,
  barWeight,
  plates,
  unit,
  compact = false,
}: {
  targetWeight: number
  barWeight: number
  plates: number[]
  unit: Unit
  compact?: boolean
}) {
  const { perSide, achieved, exact } = plateLoadout(targetWeight, barWeight, plates)
  const width = 320
  const height = compact ? 56 : 84
  const midY = height / 2
  const plateW = compact ? 9 : 12
  const gap = 2
  const sleeveStart = 42

  return (
    <div aria-label={`Load ${formatPlates(perSide)} per side for ${formatWeight(achieved, unit)}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-hidden>
        {/* bar */}
        <rect x="0" y={midY - 3} width={width} height="6" rx="3" fill="#4a453d" />
        {/* collar face */}
        <rect x={sleeveStart - 8} y={midY - 10} width="8" height="20" rx="2" fill="#6e675c" />
        {/* plates, heaviest first against the collar */}
        {perSide.map((p, i) => {
          const h = compact ? plateHeight(p, unit) * 0.65 : plateHeight(p, unit)
          return (
            <rect
              key={i}
              x={sleeveStart + i * (plateW + gap)}
              y={midY - h / 2}
              width={plateW}
              height={h}
              rx="3"
              fill={plateColor(p, unit)}
            />
          )
        })}
      </svg>
      {!compact && (
        <p className="numeral mt-1 text-center text-sm text-dust">
          {perSide.length === 0
            ? `empty bar · ${formatWeight(barWeight, unit)}`
            : `${formatPlates(perSide)} per side${exact ? '' : ` · closest ${formatWeight(achieved, unit)}`}`}
        </p>
      )}
    </div>
  )
}
