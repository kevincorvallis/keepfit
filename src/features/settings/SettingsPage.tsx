import type { Settings } from '../../lib/types'
import { useSettings } from '../../state/hooks'
import { PageHeader } from '../../app/ui'
import { SectionCard } from './SectionCard'
import { UnitsBarSection } from './UnitsBarSection'
import { PlatesSection } from './PlatesSection'
import { VolumeBandsSection } from './VolumeBandsSection'
import { DataSection } from './DataSection'
import { saveSettings } from './save'

function RestTimerSection({ settings }: { settings: Settings }) {
  const on = settings.restTimerSound
  return (
    <SectionCard label="Rest timer">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => void saveSettings(settings, { restTimerSound: !on })}
        className="flex min-h-12 w-full items-center justify-between gap-3 select-none"
      >
        <span className="text-left">
          <span className="block font-medium">Sound</span>
          <span className="block text-sm text-dust">Play a tone when the rest timer ends.</span>
        </span>
        <span
          aria-hidden
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
            on ? 'border-plate-green bg-plate-green' : 'border-line bg-raised'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-[18px] w-[18px] rounded-full transition-transform ${
              on ? 'translate-x-5 bg-ink' : 'translate-x-0 bg-dust'
            }`}
          />
        </span>
      </button>
    </SectionCard>
  )
}

function AboutSection() {
  return (
    <SectionCard label="About">
      <p className="font-display text-xl font-semibold uppercase">KeepFit v0.1</p>
      <p className="mt-1 text-sm text-dust">Evidence-based auto-progression, explained.</p>
      <p className="mt-3 text-sm text-dust">
        Suggestions follow double/linear progression with RIR-aware holds and trend-triggered
        deloads.
      </p>
    </SectionCard>
  )
}

export default function SettingsPage() {
  const settings = useSettings()
  return (
    <div>
      <PageHeader title="Settings" sub="Your gym, your data" />
      {settings && (
        <div className="space-y-4 px-5 pb-6">
          <UnitsBarSection settings={settings} />
          <PlatesSection settings={settings} />
          <VolumeBandsSection settings={settings} />
          <RestTimerSection settings={settings} />
          <DataSection settings={settings} />
          <AboutSection />
        </div>
      )}
    </div>
  )
}
