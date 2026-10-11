import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4329' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run build && npx astro preview --port 4329',
    url: 'http://localhost:4329/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
