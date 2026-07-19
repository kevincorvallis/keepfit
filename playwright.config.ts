import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: 'dev',
      testIgnore: /prod\./,
      use: { baseURL: 'http://localhost:4173' },
    },
    {
      // Production build behind the real service worker.
      name: 'prod-pwa',
      testMatch: /prod\..*\.spec\.ts/,
      use: { baseURL: 'http://localhost:4174' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
    },
    {
      command: 'npm run build && npm run preview -- --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
