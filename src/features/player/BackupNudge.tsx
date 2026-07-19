import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useFinishedSessions, useSettings } from '../../state/hooks'

const DISMISS_KEY = 'apogee:backup-dismissed'
const DAY = 86_400_000
const MIN_SESSIONS = 5
const STALE_AFTER = 30 * DAY

/**
 * Gentle data-ownership reminder on the start screen: once the log is worth
 * protecting (5+ workouts) and no backup was taken in 30 days, point at the
 * export. Dismissal is per-visit (sessionStorage) — it returns until the
 * user actually backs up, which resets settings.lastBackupAt.
 */
export function BackupNudge() {
  const settings = useSettings()
  const finished = useFinishedSessions()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (dismissed || !settings || !finished) return null
  if (finished.length < MIN_SESSIONS) return null
  if (settings.lastBackupAt !== undefined && Date.now() - settings.lastBackupAt < STALE_AFTER) {
    return null
  }

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Private browsing — banner just returns next visit.
    }
    setDismissed(true)
  }

  return (
    <div className="mx-5 mb-4 rounded-card border border-plate-blue/40 bg-plate-blue/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-semibold tracking-wide uppercase">Back up your log</p>
          <p className="mt-1 text-sm text-dust">
            {finished.length} workouts live only on this device. Download a backup so a lost phone
            never means a lost log.
          </p>
          <Link to="/settings" className="mt-2 inline-block text-sm font-semibold text-plate-blue">
            Export a backup in Settings →
          </Link>
        </div>
        <button
          type="button"
          aria-label="Dismiss backup reminder"
          onClick={dismiss}
          className="flex min-h-11 min-w-11 items-center justify-center text-faint active:text-chalk"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}
