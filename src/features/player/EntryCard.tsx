import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PlateBar } from '../../app/PlateBar'
import { formatWeight, smallestBarbellStep } from '../../lib/plates'
import { warmupPlan } from '../../lib/warmup'
import type { Exercise, LoggedSet, SessionEntry, TargetKind, Unit } from '../../lib/types'
import { SetTicket } from './SetTicket'
import { WarmupSection } from './WarmupSection'
import {
  interleavedRows,
  prFlags,
  prefillReps,
  prefillWeight,
  rowCount,
  warmupSets,
  workingSets,
  type EntryBlock,
} from './playerUtil'

/** Everything a block needs from the player, bundled to avoid prop drift. */
export interface PlayerCtx {
  exerciseMap: Map<string, Exercise>
  unit: Unit
  barWeight: number
  plates: number[]
  /** Best historical e1RM per exercise id, for PR stamps. */
  baselines: Map<string, number>
  onLogWorking: (entry: SessionEntry, weight: number, reps: number) => void
  onLogWarmup: (entry: SessionEntry, weight: number, reps: number) => void
  onUndoWarmup: (entry: SessionEntry, set: LoggedSet) => void
  onOpenAdjust: (entry: SessionEntry, setIndex: number, draftWeight?: number) => void
  onRemoveEntry: (entryId: string) => void
}

const KIND_STYLES: Record<TargetKind, string> = {
  increase: 'border-plate-green/50 text-plate-green',
  hold: 'border-plate-yellow/50 text-plate-yellow',
  deload: 'border-plate-blue/50 text-plate-blue',
  start: 'border-line text-dust',
  repeat: 'border-line text-dust',
}

const KIND_LABELS: Record<TargetKind, string> = {
  increase: '+ increase',
  hold: 'hold',
  deload: 'deload',
  start: 'start',
  repeat: 'repeat',
}

function KindChip({ kind }: { kind: TargetKind }) {
  return (
    <span
      className={`font-display rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${KIND_STYLES[kind]}`}
    >
      {KIND_LABELS[kind]}
    </span>
  )
}

/** Small ghost x with a two-tap confirm — no modal for a reversible-ish act. */
function RemoveEntryButton({ onRemove }: { onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!confirming) return
    const id = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(id)
  }, [confirming])

  if (confirming) {
    return (
      <button
        type="button"
        onClick={onRemove}
        className="min-h-12 shrink-0 px-2 text-sm font-semibold text-plate-red"
      >
        Remove?
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Remove exercise"
      className="-mt-1 -mr-2 flex h-12 w-12 shrink-0 items-center justify-center text-faint active:text-chalk"
    >
      <X size={18} aria-hidden />
    </button>
  )
}

/** Exercise name, target line with kind chip, and the engine's explanation. */
function EntryHeader({
  name,
  entry,
  unit,
  onRemove,
}: {
  name: string
  entry: SessionEntry
  unit: Unit
  onRemove: () => void
}) {
  const target = entry.target
  const repRange =
    target === undefined
      ? ''
      : target.repsLow === target.repsHigh
        ? `${target.repsHigh}`
        : `${target.repsLow}–${target.repsHigh}`
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display min-w-0 text-xl font-semibold uppercase">{name}</h3>
        <RemoveEntryButton onRemove={onRemove} />
      </div>
      {target && (
        <>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="numeral text-lg">
              {target.weight > 0
                ? `${formatWeight(target.weight, unit)} × ${repRange}`
                : `${repRange} reps`}
            </span>
            <KindChip kind={target.kind} />
          </div>
          <p className="mt-1 text-sm text-dust italic">{target.explanation}</p>
        </>
      )}
    </div>
  )
}

/** Header + inline plate loadout + collapsed warm-up ramp for one entry. */
function EntryIntro({ entry, ctx }: { entry: SessionEntry; ctx: PlayerCtx }) {
  const exercise = ctx.exerciseMap.get(entry.exerciseId)
  const name = exercise?.name ?? 'Exercise'
  const equipment = exercise?.equipment ?? 'machine'
  const weight = prefillWeight(entry)
  const showBar = equipment === 'barbell' && weight > ctx.barWeight
  // The warm-up plan is frozen for the session: it derives from the entry's
  // target (or the first logged working set), never the latest set, so
  // logged warm-up marks can't migrate onto regenerated rows mid-session.
  const targetWeight = entry.target?.weight ?? 0
  const planWeight = targetWeight > 0 ? targetWeight : (workingSets(entry)[0]?.weight ?? 0)
  const plan =
    equipment === 'bodyweight'
      ? []
      : warmupPlan({
          workingWeight: planWeight,
          equipment,
          barWeight: ctx.barWeight,
          roundTo: entry.progression?.roundTo ?? smallestBarbellStep(ctx.plates),
        })

  return (
    <div>
      <EntryHeader
        name={name}
        entry={entry}
        unit={ctx.unit}
        onRemove={() => ctx.onRemoveEntry(entry.id)}
      />
      {showBar && (
        <div className="mt-3">
          <PlateBar
            targetWeight={weight}
            barWeight={ctx.barWeight}
            plates={ctx.plates}
            unit={ctx.unit}
          />
        </div>
      )}
      {plan.length > 0 && (
        <WarmupSection
          plan={plan}
          loggedWarmups={warmupSets(entry)}
          unit={ctx.unit}
          barbell={equipment === 'barbell'}
          barWeight={ctx.barWeight}
          plates={ctx.plates}
          onLog={(w, r) => ctx.onLogWarmup(entry, w, r)}
          onUndo={(s) => ctx.onUndoWarmup(entry, s)}
        />
      )}
    </div>
  )
}

function TicketRow({
  entry,
  index,
  label,
  ctx,
}: {
  entry: SessionEntry
  index: number
  label?: string
  ctx: PlayerCtx
}) {
  const ws = workingSets(entry)
  const logged = ws[index]
  const flags = prFlags(ws, ctx.baselines.get(entry.exerciseId) ?? 0)
  const weight = prefillWeight(entry)
  const bodyweight = ctx.exerciseMap.get(entry.exerciseId)?.equipment === 'bodyweight'
  // A newly logged set always lands on the first unlogged index, so the
  // adjust sheet may only open for logged rows plus that next row —
  // otherwise "set 3" in the title would silently fill set 1's ticket.
  const canOpen = logged !== undefined || index === ws.length
  return (
    <SetTicket
      setNumber={index + 1}
      exerciseLabel={label}
      logged={logged}
      pr={logged !== undefined && flags[index]}
      weight={weight}
      reps={prefillReps(entry)}
      unit={ctx.unit}
      bodyweight={bodyweight}
      weightInput={logged === undefined && index === ws.length && weight === 0 && !bodyweight}
      onLog={(w, r) => ctx.onLogWorking(entry, w, r)}
      onOpen={(d) => {
        if (canOpen) ctx.onOpenAdjust(entry, index, d)
      }}
    />
  )
}

/** A single-exercise card, or a superset block with interleaved set rows. */
export function EntryBlockCard({ block, ctx }: { block: EntryBlock; ctx: PlayerCtx }) {
  if (block.kind === 'single') {
    const entry = block.entry
    return (
      <section className="rounded-card border border-line bg-surface p-4">
        <EntryIntro entry={entry} ctx={ctx} />
        <div className="mt-1 divide-y divide-line/50">
          {Array.from({ length: rowCount(entry) }, (_, i) => (
            <TicketRow key={`${entry.id}:${i}`} entry={entry} index={i} ctx={ctx} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-faint uppercase">
        Superset
      </p>
      <div className="mt-2 space-y-4">
        {block.entries.map((entry) => (
          <EntryIntro key={entry.id} entry={entry} ctx={ctx} />
        ))}
      </div>
      <div className="mt-2 divide-y divide-line/50">
        {interleavedRows(block.entries).map(({ entry, setIndex }) => (
          <TicketRow
            key={`${entry.id}:${setIndex}`}
            entry={entry}
            index={setIndex}
            label={ctx.exerciseMap.get(entry.exerciseId)?.name ?? 'Exercise'}
            ctx={ctx}
          />
        ))}
      </div>
    </section>
  )
}
