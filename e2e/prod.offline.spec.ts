import { test, expect } from '@playwright/test'

test('production build works fully offline after first load', async ({ page, context }) => {
  // First load: let the service worker install and precache everything.
  await page.goto('/')
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker?.ready
    return reg?.active?.state === 'activated'
  }, undefined, { timeout: 20_000 })
  // Reload once so the page is controlled by the worker.
  await page.reload()

  // Now cut the network entirely — the app must still boot and route.
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Train' })).toBeVisible()
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('radio', { name: 'lb' })).toBeVisible()
  await context.setOffline(false)
})
