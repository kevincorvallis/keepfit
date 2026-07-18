import { EmptyState, PageHeader } from '../../app/ui'
import { useExerciseMap, useFinishedSessions, useSettings } from '../../state/hooks'
import { VolumeHeatGrid } from './VolumeHeatGrid'
import { ExerciseTrend } from './ExerciseTrend'
import { PrList } from './PrList'

export default function StatsPage() {
  const sessions = useFinishedSessions()
  const exercises = useExerciseMap()
  const settings = useSettings()
  const unit = settings?.unit ?? 'kg'

  return (
    <div>
      <PageHeader sub="Analytics" title="Stats" />
      {sessions.length === 0 ? (
        <EmptyState
          title="No data yet"
          body="Finish a workout and your volume, trends and records will show up here."
        />
      ) : (
        <div className="space-y-8 px-5 pb-4">
          <VolumeHeatGrid
            sessions={sessions}
            exercises={exercises}
            volumeBands={settings?.volumeBands ?? {}}
          />
          <ExerciseTrend sessions={sessions} exercises={exercises} unit={unit} />
          <PrList sessions={sessions} exercises={exercises} unit={unit} />
        </div>
      )}
    </div>
  )
}
