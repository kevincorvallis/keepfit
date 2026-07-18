import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Settings, Unit } from '../../lib/types'
import { defaultPlates } from '../../lib/plates'
import { SectionCard } from './SectionCard'
import { saveSettings } from './save'

/**
 * Chip colors mirror the PlateBar loadout colors (IPF kg palette and the
 * parallel lb scale) so the inventory reads as the same object as the bar.
 */
const KG_CHIP: Record<number, { bg: string; fg: string }> = {
  25: { bg: 'var(--color-plate-red)', fg: 'var(--color-chalk)' },
  20: { bg: 'var(--color-plate-blue)', fg: 'var(--color-chalk)' },
  15: { bg: 'var(--color-plate-yellow)', fg: 'var(--color-ink)' },
  10: { bg: 'var(--color-plate-green)', fg: 'var(--color-ink)' },
  5: { bg: 'var(--color-plate-white)', fg: 'var(--color-ink)' },
  2.5: { bg: '#8a3f3a', fg: 'var(--color-chalk)' },
  1.25: { bg: '#8c8577', fg: 'var(--color-ink)' },
}
const LB_CHIP: Record<number, { bg: string; fg: string }> = {
  45: { bg: 'var(--color-plate-blue)', fg: 'var(--color-chalk)' },
  35: { bg: 'var(--color-plate-yellow)', fg: 'var(--color-ink)' },
  25: { bg: 'var(--color-plate-green)', fg: 'var(--color-ink)' },
  10: { bg: 'var(--color-plate-white)', fg: 'var(--color-ink)' },
  5: { bg: '#8a3f3a', fg: 'var(--color-chalk)' },
  2.5: { bg: '#8c8577', fg: 'var(--color-ink)' },
}

function chipColors(plate: number, unit: Unit): { bg: string; fg: string } | undefined {
  return (unit === 'kg' ? KG_CHIP : LB_CHIP)[plate]
}

function formatPlate(p: number): string {
  return p % 1 === 0 ? p.toFixed(0) : String(p)
}

function sortedDesc(plates: number[]): number[] {
  return [...new Set(plates)].sort((a, b) => b - a)
}

export function PlatesSection({ settings }: { settings: Settings }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const standard = defaultPlates(settings.unit)
  const custom = sortedDesc(settings.plates.filter((p) => !standard.includes(p)))

  // Functional patches: each write computes from the CURRENT db row, so two
  // quick chip taps (or a chip tap + another settings change) can't revert
  // each other via a stale render snapshot.
  const toggleStandard = (p: number) => {
    void saveSettings((current) => ({
      plates: sortedDesc(
        current.plates.includes(p)
          ? current.plates.filter((x) => x !== p)
          : [...current.plates, p],
      ),
    }))
  }

  const removePlate = (p: number) => {
    void saveSettings((current) => ({ plates: sortedDesc(current.plates.filter((x) => x !== p)) }))
  }

  const addCustom = () => {
    const value = Math.round(Number.parseFloat(draft) * 100) / 100
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a plate weight above zero.')
      return
    }
    if (settings.plates.includes(value)) {
      setError('That plate is already in your rack.')
      return
    }
    void saveSettings((current) => ({
      plates: sortedDesc(current.plates.includes(value) ? current.plates : [...current.plates, value]),
    }))
    setDraft('')
    setError(null)
    setAdding(false)
  }

  return (
    <SectionCard
      label="Plates"
      caption="Used for the bar loadout display and smallest-step rounding."
    >
      <div className="flex flex-wrap gap-2">
        {standard.map((p) => {
          const on = settings.plates.includes(p)
          const colors = chipColors(p, settings.unit)
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              aria-label={`${formatPlate(p)} ${settings.unit} plate`}
              onClick={() => toggleStandard(p)}
              className={`numeral font-display min-h-12 min-w-16 rounded-full border px-4 text-lg font-semibold transition-colors select-none ${
                on ? 'border-transparent' : 'border-line bg-raised text-dust'
              }`}
              style={on && colors ? { backgroundColor: colors.bg, color: colors.fg } : undefined}
            >
              {formatPlate(p)}
            </button>
          )
        })}
        {custom.map((p) => (
          <button
            key={p}
            type="button"
            aria-label={`Remove ${formatPlate(p)} ${settings.unit} plate`}
            onClick={() => removePlate(p)}
            className="numeral font-display inline-flex min-h-12 items-center gap-1.5 rounded-full border border-line bg-raised px-4 text-lg font-semibold text-chalk transition-colors select-none active:bg-line/60"
          >
            {formatPlate(p)}
            <X size={16} className="text-dust" aria-hidden />
          </button>
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true)
              setError(null)
            }}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-dashed border-line px-4 text-sm font-medium text-dust transition-colors select-none active:text-chalk"
          >
            <Plus size={16} aria-hidden />
            Add plate
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom()
            }}
            placeholder={settings.unit === 'kg' ? '0.5' : '1.25'}
            aria-label={`Custom plate weight in ${settings.unit}`}
            className="numeral min-h-12 w-24 rounded-card border border-line bg-ink px-3 text-lg text-chalk placeholder:text-faint"
          />
          <span className="text-sm text-dust">{settings.unit}</span>
          <button
            type="button"
            onClick={addCustom}
            className="min-h-12 rounded-card bg-plate-red-action px-4 font-semibold text-chalk transition-colors select-none active:brightness-110"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setDraft('')
              setError(null)
            }}
            className="min-h-12 rounded-card px-3 text-dust transition-colors select-none active:text-chalk"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-plate-red">{error}</p>}
    </SectionCard>
  )
}
