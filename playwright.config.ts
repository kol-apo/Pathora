import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests: real user journeys in real browsers.
 *
 * Run them with `npm run test:e2e`, never `npx playwright test` directly: the
 * runner (tests/e2e/run.ts) starts a throwaway database, seeds it, and points
 * the app at it, so the tests can never touch the real one.
 */
if (process.env.PATHORA_E2E !== '1') {
  throw new Error('Run the browser tests with `npm run test:e2e`, which uses a throwaway database.');
}

const PORT = 3077;
const baseURL = `http://localhost:${PORT}`;

// The app reads its settings from the environment; pass everything through,
// plus a separate build folder so `npm run dev` can keep running.
const serverEnv = Object.fromEntries(
  Object.entries({ ...process.env, NEXT_DIST_DIR: '.next-e2e', APP_URL: baseURL }).filter(
    (e): e is [string, string] => typeof e[1] === 'string',
  ),
);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  // One at a time: the journeys share one database and one server.
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 90_000,
  },
  projects: [
    { name: 'Chrome (Windows)', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'Edge (Windows)', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'Firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Safari engine (WebKit)', use: { ...devices['Desktop Safari'] } },
    { name: 'Android phone (Pixel 7, Chrome)', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'iPhone 14 (WebKit)', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    // A production build, as on Vercel. Set E2E_DEV=1 to use the faster-starting dev server.
    command:
      process.env.E2E_DEV === '1'
        ? `npx next dev -p ${PORT}`
        : `npx next build && npx next start -p ${PORT}`,
    url: baseURL,
    timeout: 600_000,
    reuseExistingServer: false,
    env: serverEnv,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
