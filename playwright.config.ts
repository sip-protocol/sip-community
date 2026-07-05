import { defineConfig } from '@playwright/test'

const baseURL = 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL,
  },
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
