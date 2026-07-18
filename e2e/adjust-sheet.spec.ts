import { test, expect } from '@playwright/test'

test('adjust sheet logs custom reps and RIR', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push / Pull / Legs — Push' }).click()

  await page.getByRole('button', { name: 'Adjust set 1' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Weight in lb').fill('95')
  await dialog.getByRole('button', { name: 'Decrease reps' }).click() // 8 → 7
  await dialog.getByRole('button', { name: 'RIR 2', exact: true }).click()
  await dialog.getByRole('button', { name: 'Log set', exact: true }).click()

  // Ticket reflects the adjusted set and the RIR chip.
  await expect(page.getByText('RIR 2').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Skip rest' })).toBeVisible()
})

test('escape closes the sheet without logging', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push / Pull / Legs — Push' }).click()

  await page.getByRole('button', { name: 'Adjust set 1' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Skip rest' })).not.toBeVisible()
})
