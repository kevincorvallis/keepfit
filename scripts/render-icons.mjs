import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

const svg = readFileSync('public/icon-maskable.svg', 'utf8').replace(
  '<svg ',
  '<svg style="width:100vw;height:100vh;display:block" ',
)
const targets = [
  [512, 'public/icon-512.png'],
  [192, 'public/icon-192.png'],
  [180, 'public/apple-touch-icon.png'],
]

const browser = await chromium.launch()
for (const [size, path] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`)
  await page.screenshot({ path })
  await page.close()
  console.log(`${path} (${size}x${size})`)
}
await browser.close()
