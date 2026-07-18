import { test, expect } from '@playwright/test'

test('defaults are imperial: lb unit and 45 lb bar', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('radio', { name: 'lb' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: 'kg' })).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('45 lb').first()).toBeVisible()
})

test('backup export downloads a dated JSON file', async ({ page }) => {
  await page.goto('/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup (JSON)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^apogee-backup-\d{4}-\d{2}-\d{2}\.json$/)
})

test('switching to kg converts bar weight and warns about history', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'kg' }).click()
  await expect(page.getByRole('radio', { name: 'kg' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('20 kg').first()).toBeVisible()
  await expect(page.getByText('Logged workouts keep their numbers')).toBeVisible()
})
