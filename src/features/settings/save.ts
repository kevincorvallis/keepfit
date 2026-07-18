import { db } from '../../db/db'
import type { Settings, Unit } from '../../lib/types'
import { convertProgressionUnits } from '../../lib/progression'
import { defaultBarWeight, defaultPlates } from '../../lib/plates'

type SettingsPatch = Partial<Omit<Settings, 'id'>>

/**
 * Persist a partial settings change. The patch is merged onto the CURRENT
 * database row inside a transaction — never a render-time snapshot — so two
 * rapid edits to different fields can't clobber each other. Pass a function
 * to compute the patch from the current row (e.g. toggling a plate).
 */
export async function saveSettings(
  patch: SettingsPatch | ((current: Settings) => SettingsPatch),
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await db.settings.get('app')
    if (!current) return
    const resolved = typeof patch === 'function' ? patch(current) : patch
    await db.settings.put({ ...current, ...resolved, id: 'app' })
  })
}

/**
 * Switch the app unit: resets bar weight and plates to the new unit's
 * defaults, and converts every program slot's (and any unfinished session
 * entry's) progression increment/roundTo to loadable steps in the new unit —
 * otherwise lb users chase phantom 2.5 lb increments left over from kg
 * configs. Logged numbers on finished sessions are left untouched.
 */
export async function switchUnits(from: Unit, to: Unit): Promise<void> {
  if (from === to) return
  await db.transaction('rw', [db.settings, db.programs, db.sessions], async () => {
    await saveSettings({
      unit: to,
      barWeight: defaultBarWeight(to),
      plates: [...defaultPlates(to)],
    })

    const programs = await db.programs.toArray()
    for (const program of programs) {
      for (const day of program.days) {
        for (const slot of day.slots) {
          slot.progression = convertProgressionUnits(slot.progression, from, to)
        }
      }
    }
    await db.programs.bulkPut(programs)

    const unfinished = (await db.sessions.toArray()).filter((s) => s.finishedAt === undefined)
    for (const session of unfinished) {
      for (const entry of session.entries) {
        if (entry.progression) {
          entry.progression = convertProgressionUnits(entry.progression, from, to)
        }
      }
    }
    if (unfinished.length > 0) await db.sessions.bulkPut(unfinished)
  })
}
