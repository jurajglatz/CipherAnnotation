import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, USER_STATE } from './e2e/fixtures/constants';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,        // shared seeded DB: keep specs serial for determinism
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testDir: './e2e/setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: USER_STATE },
    },
  ],
  webServer: {
    command:
      'docker compose --env-file ../.env.test -f ../docker-compose.test.yml up --build',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
