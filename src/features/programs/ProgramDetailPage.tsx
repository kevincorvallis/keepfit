import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronLeft, ChevronUp, Copy, Plus, Trash2, X } from 'lucide-react'
import type { Exercise, Program, ProgramDay, ProgramSlot } from '../../lib/types'
import { Button, EmptyState } from '../../app/ui'
import { db } from '../../db/db'
import { useExerciseMap, useSettings } from '../../state/hooks'
import { startSessionFromDay } from '../../state/workout'
import { AddExerciseSheet } from './AddExerciseSheet'
import { SlotEditorSheet } from './SlotEditorSheet'
import { ConfirmSheet, InlineText } from './controls'
import {
  addDay,
  addSlot,
  duplicateProgram,
  formatRest,
  moveSlot,
  newSlot,
  removeDay,
  removeSlot,
  updateDay,
  updateSlot,
} from './edits'

type Confirming = { kind: 'program' } | { kind: 'day'; dayId: string } | null

export default function ProgramDetailPage() {
  const { programId } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const exerciseMap = useExerciseMap()
  const unit = settings?.unit ?? 'kg'

  // Wrapped so undefined = still loading, { program: undefined } = missing.
  const result = useLiveQuery(
    async () => ({ program: programId ? await db.programs.get(programId) : undefined }),
    [programId],
  )

  const [confirming, setConfirming] = useState<Confirming>(null)
  const [editing, setEditing] = useState<{ dayId: string; slotId: string } | null>(null)
  const [addingToDay, setAddingToDay] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  if (!result) return null
  const program = result.program
  if (!program) {
    return (
      <EmptyState
        title="Program not found"
        body="It may have been deleted."
        action={
          <Link
            to="/programs"
            className="inline-flex min-h-12 items-center justify-center rounded-card border border-line bg-raised px-4 font-semibold"
          >
            Back to programs
          </Link>
        }
      />
    )
  }

  const save = (next: Program) => {
    void db.programs.put(next)
  }

  const duplicate = async () => {
    const copy = duplicateProgram(program)
    await db.programs.put(copy)
    navigate(`/programs/${copy.id}`)
  }

  // startSessionFromDay itself refuses to create a second unfinished
  // session (it returns the running one), so a stale tap here can never
  // orphan a live workout — the busy flag just stops double-submits.
  const startDay = async (day: ProgramDay) => {
    if (starting) return
    setStarting(true)
    try {
      await startSessionFromDay(program, day)
      navigate('/')
    } finally {
      setStarting(false)
    }
  }

  const confirmDelete = async () => {
    if (!confirming) return
    if (confirming.kind === 'program') {
      await db.programs.delete(program.id)
      navigate('/programs')
      return
    }
    save(removeDay(program, confirming.dayId))
    setConfirming(null)
  }

  const confirmingDay =
    confirming?.kind === 'day' ? program.days.find((d) => d.id === confirming.dayId) : undefined

  const editingDay = editing ? program.days.find((d) => d.id === editing.dayId) : undefined
  const editingSlot = editing
    ? editingDay?.slots.find((s) => s.id === editing.slotId)
    : undefined

  return (
    <div>
      <header className="px-5 pt-4 pb-2">
        <Link
          to="/programs"
          className="inline-flex min-h-12 items-center gap-1 text-sm font-medium text-dust"
        >
          <ChevronLeft size={18} aria-hidden /> Programs
        </Link>
        <h1>
          <InlineText
            label="Program name"
            value={program.name}
            onSave={(name) => save({ ...program, name })}
            className="font-display text-4xl font-bold tracking-tight uppercase"
          />
        </h1>
        <InlineText
          label="Program description"
          value={program.description ?? ''}
          onSave={(d) => save({ ...program, description: d === '' ? undefined : d })}
          placeholder="Add a description"
          allowEmpty
          className="mt-1 text-sm text-dust"
        />
      </header>

      <div className="flex gap-2 px-5 pb-4">
        <Button variant="secondary" onClick={() => void duplicate()}>
          <Copy size={16} aria-hidden /> Duplicate
        </Button>
        <Button variant="danger" onClick={() => setConfirming({ kind: 'program' })}>
          <Trash2 size={16} aria-hidden /> Delete program
        </Button>
      </div>

      {program.days.map((day) => (
        <section key={day.id} className="mx-5 mb-4 rounded-card border border-line bg-surface">
          <div className="flex items-center gap-1 p-4 pb-2">
            <InlineText
              label="Day name"
              value={day.name}
              onSave={(name) => save(updateDay(program, day.id, { name }))}
              className="font-display flex-1 text-2xl font-semibold uppercase"
            />
            <button
              type="button"
              aria-label={`Delete ${day.name}`}
              onClick={() => setConfirming({ kind: 'day', dayId: day.id })}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card text-faint active:text-chalk"
            >
              <X size={20} aria-hidden />
            </button>
          </div>

          {day.slots.length === 0 ? (
            <p className="px-4 py-3 text-sm text-faint">No exercises yet — add one below.</p>
          ) : (
            <ul>
              {day.slots.map((slot, i) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  exercise={exerciseMap.get(slot.exerciseId)}
                  first={i === 0}
                  last={i === day.slots.length - 1}
                  onEdit={() => setEditing({ dayId: day.id, slotId: slot.id })}
                  onMove={(dir) => save(moveSlot(program, day.id, slot.id, dir))}
                />
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-line p-4">
            <Button variant="secondary" onClick={() => setAddingToDay(day.id)}>
              <Plus size={16} aria-hidden /> Add exercise
            </Button>
            <Button
              variant="primary"
              big
              disabled={day.slots.length === 0 || starting}
              onClick={() => void startDay(day)}
            >
              Start this day
            </Button>
          </div>
        </section>
      ))}

      <div className="px-5 pb-4">
        <Button variant="secondary" className="w-full" onClick={() => save(addDay(program))}>
          <Plus size={16} aria-hidden /> Add day
        </Button>
      </div>

      <ConfirmSheet
        open={confirming !== null}
        title={confirming?.kind === 'day' ? 'Delete day' : 'Delete program'}
        body={
          confirming?.kind === 'day'
            ? `This removes ${confirmingDay?.name ?? 'this day'} and its ${confirmingDay?.slots.length ?? 0} ${confirmingDay?.slots.length === 1 ? 'exercise' : 'exercises'} from the program.`
            : `This permanently deletes ${program.name}. Workouts you already logged are kept.`
        }
        confirmLabel={confirming?.kind === 'day' ? 'Delete day' : 'Delete program'}
        onConfirm={() => void confirmDelete()}
        onClose={() => setConfirming(null)}
      />

      {editing && editingDay && editingSlot && (
        <SlotEditorSheet
          slot={editingSlot}
          exercise={exerciseMap.get(editingSlot.exerciseId)}
          unit={unit}
          onChange={(patch) => save(updateSlot(program, editing.dayId, editing.slotId, patch))}
          onRemove={() => {
            save(removeSlot(program, editing.dayId, editing.slotId))
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {addingToDay && (
        <AddExerciseSheet
          onAdd={(exercise) => {
            save(addSlot(program, addingToDay, newSlot(exercise, unit)))
            setAddingToDay(null)
          }}
          onClose={() => setAddingToDay(null)}
        />
      )}
    </div>
  )
}

function SlotRow({
  slot,
  exercise,
  first,
  last,
  onEdit,
  onMove,
}: {
  slot: ProgramSlot
  exercise: Exercise | undefined
  first: boolean
  last: boolean
  onEdit: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const p = slot.progression
  const reps = p.minReps === p.maxReps ? `${p.maxReps}` : `${p.minReps}–${p.maxReps}`
  return (
    <li className="flex items-center border-t border-line">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-2 text-left active:bg-raised"
      >
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{exercise?.name ?? 'Unknown exercise'}</span>
          {p.mode === 'manual' ? (
            <span className="shrink-0 text-[11px] tracking-wide text-faint uppercase">manual</span>
          ) : (
            <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[11px] tracking-wide text-dust uppercase">
              {p.mode}
            </span>
          )}
          {slot.supersetGroup && (
            <span className="shrink-0 rounded-full border border-plate-blue/50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-plate-blue uppercase">
              {slot.supersetGroup}
            </span>
          )}
        </span>
        <span className="text-sm text-dust">
          {slot.sets} {slot.sets === 1 ? 'set' : 'sets'} · {reps} reps · rest{' '}
          {formatRest(slot.restSeconds)}
        </span>
      </button>
      <button
        type="button"
        aria-label={`Move ${exercise?.name ?? 'exercise'} up`}
        disabled={first}
        onClick={() => onMove(-1)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-dust active:text-chalk disabled:opacity-30"
      >
        <ChevronUp size={20} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Move ${exercise?.name ?? 'exercise'} down`}
        disabled={last}
        onClick={() => onMove(1)}
        className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-dust active:text-chalk disabled:opacity-30"
      >
        <ChevronDown size={20} aria-hidden />
      </button>
    </li>
  )
}
