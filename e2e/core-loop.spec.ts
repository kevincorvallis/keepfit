import { test, expect } from '@playwright/test'

async function skipRestIfRunning(page: import('@playwright/test').Page) {
  const skip = page.getByRole('button', { name: 'Skip rest' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

test('full loop: first session → finish → next session progresses with an explanation', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Start Push / Pull / Legs — Push' }).click()
  await expect(page.getByText('First session — pick a weight').first()).toBeVisible()

  // Bench Press: enter the first working weight, then one-tap the rest.
  await page.getByLabel('Set 1 weight in lb').first().fill('95')
  await page.getByRole('button', { name: 'Log set 1: 95 lb × 8' }).click()

  // Rest timer starts with a next-set preview.
  await expect(page.getByRole('button', { name: 'Skip rest' })).toBeVisible()
  await expect(page.getByText('Next up ·')).toBeVisible()
  await page.getByRole('button', { name: 'Skip rest' }).click()

  // Plate math for 95 lb on a 45 lb bar: one 25 per side.
  await expect(page.getByText('25 per side').first()).toBeVisible()

  for (const n of [2, 3, 4]) {
    await page.getByRole('button', { name: `Log set ${n}: 95 lb × 8` }).click()
    await skipRestIfRunning(page)
  }

  // Finish → scoreboard → history detail.
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('4', { exact: true })).toBeVisible() // working sets
  await expect(sheet.getByText('3,040 lb')).toBeVisible() // 4 × 95 × 8 volume
  await sheet.getByRole('button', { name: 'Finish workout' }).click()
  await expect(page).toHaveURL(/\/history\/.+/)
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible()

  // Next session: explained double-progression increase (+5 lb barbell step).
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push / Pull / Legs — Push' }).click()
  await expect(
    page.getByText('+5 lb because you hit 8 reps on all sets last session.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log set 1: 100 lb × 8' })).toBeVisible()
})
