import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
})
