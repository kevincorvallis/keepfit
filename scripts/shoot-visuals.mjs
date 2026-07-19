// Dev-only: seed realistic history into the app's IndexedDB and screenshot
// the data visuals for a design review. Usage: node scripts/shoot-visuals.mjs
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:4173'
const OUT = process.env.SHOT_DIR ?? '.'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

// Empty state first, before seeding.
await page.goto(`${BASE}/history`)
await page.getByText('No workouts yet').waitFor({ timeout: 10000 })
await page.screenshot({ path: `${OUT}/v-empty.png` })

// Seed ~8 weeks of finished sessions directly into Dexie's store.
await page.evaluate(async () => {
  const DAY = 86_400_000
  const now = Date.now()
  const sessions = []
  const mk = (daysAgo, name, exerciseId, baseWeight, reps, sets) => {
    const startedAt = now - daysAgo * DAY - 3_600_000
    return {
      id: crypto.randomUUID(),
      name,
      startedAt,
      finishedAt: startedAt + 3_500_000,
      entries: [
        {
          id: crypto.randomUUID(),
          exerciseId,
          restSeconds: 180,
          sets: Array.from({ length: sets }, (_, i) => ({
            id: crypto.randomUUID(),
            weight: baseWeight,
            reps,
            rir: i === sets - 1 ? 1 : 2,
            isWarmup: false,
            completedAt: startedAt + (i + 1) * 300_000,
          })),
        },
        {
          id: crypto.randomUUID(),
          exerciseId: 'db-lateral-raise',
          restSeconds: 90,
          sets: Array.from({ length: 3 }, (_, i) => ({
            id: crypto.randomUUID(),
            weight: 20,
            reps: 12,
            isWarmup: false,
            completedAt: startedAt + (sets + i + 1) * 300_000,
          })),
        },
      ],
    }
  }
  for (let w = 11; w >= 0; w--) {
    sessions.push(mk(w * 7 + 5, 'Push / Pull / Legs — Push', 'bb-bench-press', 155 + (11 - w) * 5, 8, 4))
    sessions.push(mk(w * 7 + 3, 'Push / Pull / Legs — Legs', 'bb-back-squat', 205 + (11 - w) * 5, 6, 4))
    if (w % 2 === 0) sessions.push(mk(w * 7 + 1, 'Push / Pull / Legs — Pull', 'cb-lat-pulldown', 120, 10, 3))
  }
  await new Promise((resolve, reject) => {
    const open = indexedDB.open('apogee')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('sessions', 'readwrite')
      const store = tx.objectStore('sessions')
      for (const s of sessions) store.put(s)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
  })
})

await page.goto(`${BASE}/stats`)
await page.getByText('Consistency').waitFor({ timeout: 10000 })
await page.screenshot({ path: `${OUT}/v-stats-top.png` })
await page.getByRole('heading', { name: /Exercise trend/ }).waitFor()
// Scroll to the trend chart area and shoot it.
await page.evaluate(() => window.scrollBy(0, 700))
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/v-stats-trend.png` })

// A progressing series makes the chart earn its keep.
await page.getByRole('button', { name: 'Bench Press' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/v-trend-bench.png` })

// Session detail with muscle bars.
await page.goto(`${BASE}/history`)
await page.getByText('Push / Pull / Legs').first().click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/v-session-detail.png` })

await browser.close()
console.log('shots done')
