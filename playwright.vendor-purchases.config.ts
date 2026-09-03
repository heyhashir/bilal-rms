import { defineConfig, devices } from "@playwright/test";

delete process.env.NO_COLOR;

// These browser tests intercept every API request and never start or reset a database.
export default defineConfig({
  testDir: "./e2e/vendor-purchases",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  outputDir: "test-results/vendor-purchases",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5012",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5012 --strictPort",
    url: "http://127.0.0.1:5012",
    reuseExistingServer: false,
  },
});
