import type {
  Equipment,
  Exercise,
  MuscleGroup,
  Program,
  ProgramSlot,
  Settings,
  Unit,
} from '../lib/types'
import { DEFAULT_VOLUME_BANDS } from '../lib/types'
import { defaultProgression } from '../lib/progression'
import { DEFAULT_BAR_LB, DEFAULT_PLATES_LB } from '../lib/plates'

function ex(
  id: string,
  name: string,
  equipment: Equipment,
  primary: MuscleGroup[],
  secondary: MuscleGroup[] = [],
): Exercise {
  return { id, name, equipment, primaryMuscles: primary, secondaryMuscles: secondary }
}

export function seedExercises(): Exercise[] {
  return [
    // Barbell
    ex('bb-back-squat', 'Back Squat', 'barbell', ['quads', 'glutes'], ['hamstrings', 'abs']),
    ex('bb-front-squat', 'Front Squat', 'barbell', ['quads'], ['glutes', 'abs']),
    ex('bb-bench-press', 'Bench Press', 'barbell', ['chest'], ['triceps', 'shoulders']),
    ex('bb-incline-bench', 'Incline Bench Press', 'barbell', ['chest', 'shoulders'], ['triceps']),
    ex('bb-close-grip-bench', 'Close-Grip Bench Press', 'barbell', ['triceps'], ['chest', 'shoulders']),
    ex('bb-deadlift', 'Deadlift', 'barbell', ['back', 'hamstrings', 'glutes'], ['forearms', 'quads']),
    ex('bb-rdl', 'Romanian Deadlift', 'barbell', ['hamstrings', 'glutes'], ['back']),
    ex('bb-ohp', 'Overhead Press', 'barbell', ['shoulders'], ['triceps', 'abs']),
    ex('bb-row', 'Barbell Row', 'barbell', ['back'], ['biceps', 'forearms']),
    ex('bb-hip-thrust', 'Hip Thrust', 'barbell', ['glutes'], ['hamstrings']),
    ex('bb-curl', 'Barbell Curl', 'barbell', ['biceps'], ['forearms']),
    // Dumbbell
    ex('db-bench-press', 'Dumbbell Bench Press', 'dumbbell', ['chest'], ['triceps', 'shoulders']),
    ex('db-incline-press', 'Dumbbell Incline Press', 'dumbbell', ['chest', 'shoulders'], ['triceps']),
    ex('db-shoulder-press', 'Dumbbell Shoulder Press', 'dumbbell', ['shoulders'], ['triceps']),
    ex('db-row', 'Dumbbell Row', 'dumbbell', ['back'], ['biceps', 'forearms']),
    ex('db-curl', 'Dumbbell Curl', 'dumbbell', ['biceps'], ['forearms']),
    ex('db-hammer-curl', 'Hammer Curl', 'dumbbell', ['biceps'], ['forearms']),
    ex('db-lateral-raise', 'Lateral Raise', 'dumbbell', ['shoulders']),
    ex('db-rear-delt-fly', 'Rear Delt Fly', 'dumbbell', ['shoulders'], ['back']),
    ex('db-lunge', 'Dumbbell Lunge', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
    ex('db-bulgarian-split-squat', 'Bulgarian Split Squat', 'dumbbell', ['quads', 'glutes'], ['hamstrings']),
    ex('db-rdl', 'Dumbbell RDL', 'dumbbell', ['hamstrings', 'glutes'], ['back']),
    ex('db-skullcrusher', 'Dumbbell Skullcrusher', 'dumbbell', ['triceps']),
    ex('db-fly', 'Dumbbell Fly', 'dumbbell', ['chest']),
    ex('db-shrug', 'Dumbbell Shrug', 'dumbbell', ['back'], ['forearms']),
    // Machine
    ex('mc-leg-press', 'Leg Press', 'machine', ['quads', 'glutes'], ['hamstrings']),
    ex('mc-leg-extension', 'Leg Extension', 'machine', ['quads']),
    ex('mc-leg-curl', 'Leg Curl', 'machine', ['hamstrings']),
    ex('mc-calf-raise', 'Calf Raise (Machine)', 'machine', ['calves']),
    ex('mc-chest-press', 'Machine Chest Press', 'machine', ['chest'], ['triceps', 'shoulders']),
    ex('mc-shoulder-press', 'Machine Shoulder Press', 'machine', ['shoulders'], ['triceps']),
    ex('mc-pec-deck', 'Pec Deck', 'machine', ['chest']),
    ex('mc-hack-squat', 'Hack Squat', 'machine', ['quads'], ['glutes']),
    ex('mc-hip-abduction', 'Hip Abduction', 'machine', ['glutes']),
    ex('mc-back-extension', 'Back Extension', 'machine', ['back', 'glutes'], ['hamstrings']),
    // Cable
    ex('cb-lat-pulldown', 'Lat Pulldown', 'cable', ['back'], ['biceps']),
    ex('cb-seated-row', 'Seated Cable Row', 'cable', ['back'], ['biceps', 'forearms']),
    ex('cb-triceps-pushdown', 'Triceps Pushdown', 'cable', ['triceps']),
    ex('cb-overhead-extension', 'Cable Overhead Extension', 'cable', ['triceps']),
    ex('cb-curl', 'Cable Curl', 'cable', ['biceps']),
    ex('cb-lateral-raise', 'Cable Lateral Raise', 'cable', ['shoulders']),
    ex('cb-face-pull', 'Face Pull', 'cable', ['shoulders', 'back']),
    ex('cb-fly', 'Cable Fly', 'cable', ['chest']),
    ex('cb-crunch', 'Cable Crunch', 'cable', ['abs']),
    // Bodyweight
    ex('bw-pullup', 'Pull-Up', 'bodyweight', ['back'], ['biceps', 'forearms']),
    ex('bw-chinup', 'Chin-Up', 'bodyweight', ['back', 'biceps'], ['forearms']),
    ex('bw-dip', 'Dip', 'bodyweight', ['chest', 'triceps'], ['shoulders']),
    ex('bw-pushup', 'Push-Up', 'bodyweight', ['chest'], ['triceps', 'shoulders']),
    ex('bw-plank', 'Plank', 'bodyweight', ['abs']),
    ex('bw-hanging-leg-raise', 'Hanging Leg Raise', 'bodyweight', ['abs'], ['forearms']),
    ex('bw-ab-wheel', 'Ab Wheel Rollout', 'bodyweight', ['abs']),
  ]
}

let slotCounter = 0
let slotUnit: Unit = 'lb'
function slot(
  exerciseId: string,
  sets: number,
  opts?: Partial<Pick<ProgramSlot, 'restSeconds' | 'supersetGroup'>> & {
    equipment?: Equipment
    mode?: 'double' | 'linear'
    isolation?: boolean
  },
): ProgramSlot {
  const equipment = opts?.equipment ?? inferEquipment(exerciseId)
  return {
    id: `slot-${++slotCounter}`,
    exerciseId,
    sets,
    restSeconds: opts?.restSeconds ?? (equipment === 'barbell' ? 180 : 90),
    supersetGroup: opts?.supersetGroup,
    progression: defaultProgression(equipment, slotUnit, {
      mode: opts?.mode,
      isolation: opts?.isolation,
    }),
  }
}

function inferEquipment(exerciseId: string): Equipment {
  if (exerciseId.startsWith('bb-')) return 'barbell'
  if (exerciseId.startsWith('db-')) return 'dumbbell'
  if (exerciseId.startsWith('mc-')) return 'machine'
  if (exerciseId.startsWith('cb-')) return 'cable'
  return 'bodyweight'
}

/** Program templates, with progression increments in the app's current unit. */
export function seedPrograms(unit: Unit = 'lb'): Program[] {
  const createdAt = Date.parse('2026-01-01T00:00:00Z')
  slotCounter = 0
  slotUnit = unit
  return [
    {
      id: 'tpl-starter-full-body',
      name: 'Starter Full Body',
      description:
        '3 days a week, linear progression on the big lifts. The fastest road for a first year of lifting.',
      createdAt,
      days: [
        {
          id: 'sfb-a',
          name: 'Day A',
          slots: [
            slot('bb-back-squat', 3, { mode: 'linear' }),
            slot('bb-bench-press', 3, { mode: 'linear' }),
            slot('bb-row', 3, { mode: 'linear' }),
            slot('db-curl', 2, { isolation: true }),
            slot('bw-plank', 3),
          ],
        },
        {
          id: 'sfb-b',
          name: 'Day B',
          slots: [
            slot('bb-deadlift', 2, { mode: 'linear' }),
            slot('bb-ohp', 3, { mode: 'linear' }),
            slot('cb-lat-pulldown', 3),
            slot('cb-triceps-pushdown', 2, { isolation: true }),
            slot('bw-hanging-leg-raise', 3),
          ],
        },
      ],
    },
    {
      id: 'tpl-upper-lower',
      name: 'Upper / Lower',
      description:
        '4 days a week, double progression. The workhorse split for intermediate strength and size.',
      createdAt,
      days: [
        {
          id: 'ul-upper-1',
          name: 'Upper 1',
          slots: [
            slot('bb-bench-press', 4),
            slot('bb-row', 4),
            slot('bb-ohp', 3),
            slot('cb-lat-pulldown', 3),
            slot('db-curl', 3, { isolation: true, supersetGroup: 'A' }),
            slot('cb-triceps-pushdown', 3, { isolation: true, supersetGroup: 'A' }),
          ],
        },
        {
          id: 'ul-lower-1',
          name: 'Lower 1',
          slots: [
            slot('bb-back-squat', 4),
            slot('bb-rdl', 3),
            slot('mc-leg-press', 3),
            slot('mc-leg-curl', 3, { isolation: true }),
            slot('mc-calf-raise', 4, { isolation: true }),
          ],
        },
        {
          id: 'ul-upper-2',
          name: 'Upper 2',
          slots: [
            slot('db-incline-press', 4),
            slot('bw-pullup', 4),
            slot('db-shoulder-press', 3),
            slot('cb-seated-row', 3),
            slot('db-lateral-raise', 3, { isolation: true, supersetGroup: 'A' }),
            slot('cb-face-pull', 3, { isolation: true, supersetGroup: 'A' }),
          ],
        },
        {
          id: 'ul-lower-2',
          name: 'Lower 2',
          slots: [
            slot('bb-deadlift', 3),
            slot('mc-hack-squat', 3),
            slot('db-bulgarian-split-squat', 3),
            slot('mc-leg-extension', 3, { isolation: true }),
            slot('cb-crunch', 3, { isolation: true }),
          ],
        },
      ],
    },
    {
      id: 'tpl-ppl',
      name: 'Push / Pull / Legs',
      description:
        'The classic hypertrophy split, double progression. Run it 3–6 days a week.',
      createdAt,
      days: [
        {
          id: 'ppl-push',
          name: 'Push',
          slots: [
            slot('bb-bench-press', 4),
            slot('bb-ohp', 3),
            slot('db-incline-press', 3),
            slot('db-lateral-raise', 4, { isolation: true }),
            slot('cb-triceps-pushdown', 3, { isolation: true, supersetGroup: 'A' }),
            slot('cb-overhead-extension', 3, { isolation: true, supersetGroup: 'A' }),
          ],
        },
        {
          id: 'ppl-pull',
          name: 'Pull',
          slots: [
            slot('bb-deadlift', 2),
            slot('bw-pullup', 4),
            slot('cb-seated-row', 3),
            slot('cb-face-pull', 3, { isolation: true }),
            slot('db-curl', 3, { isolation: true, supersetGroup: 'A' }),
            slot('db-hammer-curl', 3, { isolation: true, supersetGroup: 'A' }),
          ],
        },
        {
          id: 'ppl-legs',
          name: 'Legs',
          slots: [
            slot('bb-back-squat', 4),
            slot('bb-rdl', 3),
            slot('mc-leg-press', 3),
            slot('mc-leg-curl', 3, { isolation: true }),
            slot('mc-calf-raise', 4, { isolation: true }),
            slot('cb-crunch', 3, { isolation: true }),
          ],
        },
      ],
    },
  ]
}

export function defaultSettings(): Settings {
  return {
    id: 'app',
    unit: 'lb',
    barWeight: DEFAULT_BAR_LB,
    plates: DEFAULT_PLATES_LB,
    volumeBands: { ...DEFAULT_VOLUME_BANDS },
    restTimerSound: true,
  }
}
