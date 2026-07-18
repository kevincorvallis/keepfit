import type { Exercise, Program, ProgramDay, ProgramSlot, Unit } from '../../lib/types'
import { defaultProgression } from '../../lib/progression'
import { newId } from '../../db/db'

/** Pure Program → Program transforms; pages persist the result via db.programs.put. */

const ISOLATION_MUSCLES = new Set<string>([
  'biceps',
  'triceps',
  'calves',
  'shoulders',
  'abs',
  'forearms',
])

export function isIsolation(exercise: Exercise): boolean {
  return exercise.primaryMuscles.length === 1 && ISOLATION_MUSCLES.has(exercise.primaryMuscles[0])
}

/** A fresh slot for an exercise with evidence-based defaults. */
export function newSlot(exercise: Exercise, unit: Unit): ProgramSlot {
  return {
    id: newId(),
    exerciseId: exercise.id,
    sets: 3,
    restSeconds: exercise.equipment === 'barbell' ? 180 : 90,
    progression: defaultProgression(exercise.equipment, unit, { isolation: isIsolation(exercise) }),
  }
}

/** Deep copy with all-new ids, named "<name> copy". */
export function duplicateProgram(program: Program): Program {
  return {
    id: newId(),
    name: `${program.name} copy`,
    description: program.description,
    createdAt: Date.now(),
    days: program.days.map((day) => ({
      id: newId(),
      name: day.name,
      slots: day.slots.map((slot) => ({
        ...slot,
        id: newId(),
        progression: { ...slot.progression },
      })),
    })),
  }
}

function updateDayBy(program: Program, dayId: string, fn: (day: ProgramDay) => ProgramDay): Program {
  return { ...program, days: program.days.map((d) => (d.id === dayId ? fn(d) : d)) }
}

export function updateDay(
  program: Program,
  dayId: string,
  patch: Partial<Omit<ProgramDay, 'id'>>,
): Program {
  return updateDayBy(program, dayId, (d) => ({ ...d, ...patch }))
}

export function addDay(program: Program): Program {
  return {
    ...program,
    days: [...program.days, { id: newId(), name: `Day ${program.days.length + 1}`, slots: [] }],
  }
}

export function removeDay(program: Program, dayId: string): Program {
  return { ...program, days: program.days.filter((d) => d.id !== dayId) }
}

export function addSlot(program: Program, dayId: string, slot: ProgramSlot): Program {
  return updateDayBy(program, dayId, (d) => ({ ...d, slots: [...d.slots, slot] }))
}

export function updateSlot(
  program: Program,
  dayId: string,
  slotId: string,
  patch: Partial<Omit<ProgramSlot, 'id'>>,
): Program {
  return updateDayBy(program, dayId, (d) => ({
    ...d,
    slots: d.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)),
  }))
}

export function removeSlot(program: Program, dayId: string, slotId: string): Program {
  return updateDayBy(program, dayId, (d) => ({
    ...d,
    slots: d.slots.filter((s) => s.id !== slotId),
  }))
}

export function moveSlot(program: Program, dayId: string, slotId: string, dir: -1 | 1): Program {
  return updateDayBy(program, dayId, (d) => {
    const i = d.slots.findIndex((s) => s.id === slotId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= d.slots.length) return d
    const slots = [...d.slots]
    const [moved] = slots.splice(i, 1)
    slots.splice(j, 0, moved)
    return { ...d, slots }
  })
}

/** none → A → B → C → none */
export function nextSupersetGroup(group: string | undefined): string | undefined {
  if (group === undefined) return 'A'
  if (group === 'A') return 'B'
  if (group === 'B') return 'C'
  return undefined
}

/** Seconds → "m:ss", e.g. 120 → "2:00". */
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
