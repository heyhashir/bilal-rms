import { defineConfig } from "@playwright/test";
import fixtures from "./playwright.vendor-purchases.config";

export default defineConfig({
  ...fixtures,
  testDir: "./e2e/stickers",
  outputDir: "test-results/stickers",
  use: { ...fixtures.use, deviceScaleFactor: 3 },
});
