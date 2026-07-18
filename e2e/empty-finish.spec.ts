import { test, expect } from '@playwright/test'

test('finishing with nothing logged discards instead of saving an empty session', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start empty workout' }).click()

  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('finishing now discards this workout')).toBeVisible()
  await sheet.getByRole('button', { name: 'Finish workout' }).click()

  // Back on the start home, and history stays empty.
  await expect(page.getByRole('button', { name: 'Start empty workout' })).toBeVisible()
  await page.goto('/history')
  await expect(page.getByText('No workouts yet')).toBeVisible()
})

test('starting a day twice resumes the active session instead of duplicating it', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Push / Pull / Legs — Push' }).click()
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible()

  // Navigate to programs and hit Start again — should land back in the same session.
  await page.goto('/programs')
  await page.getByText('Push / Pull / Legs').first().click()
  await page.getByRole('button', { name: /Start this day/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible()

  // Exactly one active workout: discarding it returns to the start home.
  await page.getByRole('button', { name: 'Discard workout' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Discard workout' }).click()
  await expect(page.getByRole('button', { name: 'Start empty workout' })).toBeVisible()
})
