import { Button, Sheet } from '../../app/ui'
import type { Unit } from '../../lib/types'
import { formatClock } from './playerUtil'

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-raised p-3">
      <dt className="font-display text-xs font-semibold tracking-wide text-dust uppercase">
        {label}
      </dt>
      <dd className={`numeral font-display mt-1 text-3xl font-bold ${accent ? 'text-plate-red' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

/** Confirm-finish sheet with the session scoreboard. */
export function FinishSheet({
  durationSeconds,
  sets,
  volume,
  prCount,
  unit,
  busy,
  onFinish,
  onClose,
}: {
  durationSeconds: number
  sets: number
  volume: number
  prCount: number
  unit: Unit
  busy: boolean
  onFinish: () => void
  onClose: () => void
}) {
  return (
    <Sheet open onClose={onClose} title="Finish workout">
      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Duration" value={formatClock(durationSeconds)} />
        <Stat label="Working sets" value={String(sets)} />
        <Stat label="Volume" value={`${Math.round(volume).toLocaleString()} ${unit}`} />
        <Stat label="PRs" value={String(prCount)} accent={prCount > 0} />
      </dl>
      {sets === 0 && (
        <p className="mt-3 text-sm text-dust">
          Nothing is logged yet — exercises without sets are dropped when you finish.
        </p>
      )}
      <div className="mt-5 space-y-2">
        <Button variant="primary" big disabled={busy} onClick={onFinish}>
          Finish workout
        </Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Keep training
        </Button>
      </div>
    </Sheet>
  )
}
