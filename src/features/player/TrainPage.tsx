import { useState } from 'react'
import { Button, EmptyState, PageHeader } from '../../app/ui'
import { useActiveSession, useExerciseMap, usePrograms } from '../../state/hooks'
import { startEmptySession, startSessionFromDay } from '../../state/workout'
import type { Program, ProgramDay } from '../../lib/types'
import ActiveWorkout from './ActiveWorkout'
import { DeloadBanner } from './DeloadBanner'

/**
 * The Train tab: the workout player when a session is live, otherwise the
 * start home — one card per program day, plus a freestyle start.
 */
export default function TrainPage() {
  const active = useActiveSession()
  if (active) return <ActiveWorkout session={active} />
  return <StartHome />
}

function StartHome() {
  const programs = usePrograms()
  const exerciseMap = useExerciseMap()
  const [starting, setStarting] = useState(false)

  async function startDay(program: Program, day: ProgramDay) {
    if (starting) return
    setStarting(true)
    try {
      await startSessionFromDay(program, day)
      // The live query flips this page to the player automatically.
    } finally {
      setStarting(false)
    }
  }

  async function startEmpty() {
    if (starting) return
    setStarting(true)
    try {
      await startEmptySession()
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <PageHeader sub="KeepFit" title="Train" />
      <DeloadBanner />
      {programs.length === 0 ? (
        <EmptyState
          title="No programs yet"
          body="Build one in the programs tab, or start an empty workout and log as you go."
        />
      ) : (
        <div className="space-y-3 px-5">
          {programs.flatMap((program) =>
            program.days.map((day) => {
              const names = day.slots
                .slice(0, 3)
                .map((slot) => exerciseMap.get(slot.exerciseId)?.name ?? 'Exercise')
                .join(' · ')
              const more = day.slots.length - 3
              return (
                <div
                  key={`${program.id}:${day.id}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4"
                >
                  <div className="min-w-0">
                    <p className="font-display text-xs font-semibold tracking-[0.14em] text-faint uppercase">
                      {program.name}
                    </p>
                    <h2 className="font-display text-xl font-semibold uppercase">{day.name}</h2>
                    <p className="mt-0.5 text-sm text-dust">
                      {names}
                      {more > 0 && <span className="text-faint"> +{more} more</span>}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    disabled={starting}
                    onClick={() => {
                      void startDay(program, day)
                    }}
                    aria-label={`Start ${program.name} — ${day.name}`}
                  >
                    Start
                  </Button>
                </div>
              )
            }),
          )}
        </div>
      )}
      <div className="px-5 pt-4">
        <Button
          variant="secondary"
          className="w-full"
          disabled={starting}
          onClick={() => {
            void startEmpty()
          }}
        >
          Start empty workout
        </Button>
      </div>
    </div>
  )
}
