import type { Settings, Unit } from '../../lib/types'
import { formatWeight } from '../../lib/plates'
import { SectionCard } from './SectionCard'
import { Stepper } from './Stepper'
import { saveSettings, switchUnits } from './save'

const UNITS: Unit[] = ['kg', 'lb']

export function UnitsBarSection({ settings }: { settings: Settings }) {
  const barStep = settings.unit === 'kg' ? 2.5 : 5

  const switchUnit = (unit: Unit) => {
    if (unit === settings.unit) return
    void switchUnits(settings.unit, unit)
  }

  return (
    <SectionCard label="Units & bar">
      <div className="flex rounded-card border border-line bg-ink p-1" role="radiogroup" aria-label="Weight unit">
        {UNITS.map((u) => (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={settings.unit === u}
            onClick={() => switchUnit(u)}
            className={`font-display min-h-12 flex-1 rounded-lg text-lg font-semibold uppercase transition-colors select-none ${
              settings.unit === u ? 'bg-raised text-chalk' : 'text-faint'
            }`}
          >
            {u}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-plate-yellow">
        Program increments and plates switch to {settings.unit === 'kg' ? 'lb' : 'kg'} steps.
        Logged workouts keep their numbers — they are not converted.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-medium">Bar weight</p>
        <Stepper
          big
          value={settings.barWeight}
          onChange={(barWeight) => void saveSettings({ barWeight })}
          step={barStep}
          min={0}
          max={999}
          label="bar weight"
          format={(v) => formatWeight(v, settings.unit)}
        />
      </div>
    </SectionCard>
  )
}
