import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? 'http://127.0.0.1:5000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'qa-smoke', testMatch: /smoke\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'qa-regression', testMatch: /regression\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'qa-live', testMatch: /live\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'qa-customer', testMatch: /qa\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'qa-edge', testMatch: /qa\/.*\.spec\.ts/, use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'qa-tablet', testMatch: /qa\/.*\.spec\.ts/, use: { ...devices['iPad (gen 7)'] } },
    { name: 'qa-mobile', testMatch: /qa\/.*\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
});
