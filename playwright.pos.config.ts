import { defineConfig } from "@playwright/test";
import fixtureConfig from "./playwright.vendor-purchases.config";

// Vite only; every API call is mocked. No database, reset, or live sale.
export default defineConfig({
  ...fixtureConfig,
  testDir: "./e2e/pos",
  outputDir: "test-results/pos",
  projects: [{ name: "web" }, { name: "desktop-renderer" }],
});
