import { db } from '../../db/db'
import type { Settings } from '../../lib/types'

/** Persist a partial settings change on top of the current settings row. */
export async function saveSettings(current: Settings, patch: Partial<Settings>): Promise<void> {
  await db.settings.put({ ...current, ...patch, id: 'app' })
}
