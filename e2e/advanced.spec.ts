import { test, expect } from '@playwright/test'

test('backup export → wipe → import restores history losslessly', async ({ page }, testInfo) => {
  // Create one finished session.
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push / Pull / Legs — Push' }).click()
  await page.getByLabel('Set 1 weight in lb').first().fill('95')
  await page.getByRole('button', { name: 'Log set 1: 95 lb × 8' }).click()
  await page.getByRole('button', { name: 'Skip rest' }).click()
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Finish workout' }).click()
  await expect(page).toHaveURL(/\/history\/.+/)

  // Export a backup.
  await page.goto('/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup (JSON)' }).click()
  const backupPath = testInfo.outputPath('backup.json')
  await (await downloadPromise).saveAs(backupPath)

  // Wipe everything (double-tap confirm), history must be empty.
  await page.getByRole('button', { name: 'Delete all data' }).click()
  const wipe = page.getByRole('dialog')
  await wipe.getByRole('button', { name: 'Delete everything' }).click()
  await wipe.getByRole('button', { name: 'Tap again to confirm' }).click()
  // The sheet closes only once the wipe + reseed transaction is done.
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('link', { name: 'History' }).click()
  await expect(page.getByText('No workouts yet')).toBeVisible()

  // Import the backup and confirm the session is back.
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.locator('input[type="file"]').setInputFiles(backupPath)
  const confirm = page.getByRole('dialog')
  await expect(confirm.getByText('1 session')).toBeVisible()
  await confirm.getByRole('button', { name: 'Replace and import' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('link', { name: 'History' }).click()
  await expect(page.getByText('Push / Pull / Legs — Push').first()).toBeVisible()
})

test('superset block interleaves both exercises', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Upper / Lower — Upper 1' }).click()
  await expect(page.getByText('Superset').first()).toBeVisible()
  // Both superset exercises expose per-exercise adjust rows inside one block.
  await expect(
    page.getByRole('button', { name: 'Adjust set 2 — Dumbbell Curl' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Adjust set 2 — Triceps Pushdown' }),
  ).toBeVisible()
})

test('rest timer reaches Go when the full rest elapses', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push / Pull / Legs — Push' }).click()
  await page.getByLabel('Set 1 weight in lb').first().fill('95')
  await page.getByRole('button', { name: 'Log set 1: 95 lb × 8' }).click()
  await expect(page.getByRole('timer')).toBeVisible()

  // Bench rest is 180 s — jump past it and the bar must flip to "Go".
  await page.clock.fastForward('03:05')
  await expect(page.getByRole('timer')).toHaveText('Go')
})
