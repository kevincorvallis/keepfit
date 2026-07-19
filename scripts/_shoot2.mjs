import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-502/-Users-kevin-lee1-code-personal-keepfit/76c498d8-703b-4732-9df9-11a8d0b36424/scratchpad'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto('http://localhost:4173/stats')
await page.getByRole('heading', { name: /Exercise trend/ }).waitFor()
await page.getByRole('button', { name: 'Bench Press' }).click()
await page.getByRole('heading', { name: /Exercise trend/ }).scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/v-trend-bench.png` })
await browser.close()
console.log('done')
