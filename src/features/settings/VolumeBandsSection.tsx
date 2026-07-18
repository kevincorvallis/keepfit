import type { MuscleGroup, Settings, VolumeBand } from '../../lib/types'
import { DEFAULT_VOLUME_BANDS, MUSCLE_GROUPS } from '../../lib/types'
import { SectionCard } from './SectionCard'
import { Stepper } from './Stepper'
import { saveSettings } from './save'

export function VolumeBandsSection({ settings }: { settings: Settings }) {
  const bandFor = (m: MuscleGroup): VolumeBand => settings.volumeBands[m] ?? DEFAULT_VOLUME_BANDS[m]

  const setBand = (m: MuscleGroup, band: VolumeBand) => {
    void saveSettings(settings, { volumeBands: { ...settings.volumeBands, [m]: band } })
  }

  return (
    <SectionCard
      label="Weekly volume bands"
      caption="Guideline working-set ranges the Stats heatmap colors against. Starting points, not prescriptions."
    >
      <div className="divide-y divide-line/60">
        {MUSCLE_GROUPS.map((m) => {
          const band = bandFor(m)
          return (
            <div key={m} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
              <p className="text-sm font-medium capitalize">{m}</p>
              <div className="flex items-center gap-1.5">
                <Stepper
                  value={band.low}
                  onChange={(low) => setBand(m, { ...band, low })}
                  step={1}
                  min={0}
                  max={band.high}
                  label={`${m} low sets per week`}
                />
                <span className="text-faint" aria-hidden>
                  –
                </span>
                <Stepper
                  value={band.high}
                  onChange={(high) => setBand(m, { ...band, high })}
                  step={1}
                  min={band.low}
                  max={30}
                  label={`${m} high sets per week`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
