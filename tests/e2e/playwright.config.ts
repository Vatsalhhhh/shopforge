import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "../reports/e2e-artifacts",
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },

  reporter: [
    ["html", { outputFolder: "../reports/e2e-report", open: "never" }],
    ["json", { outputFile: "../reports/e2e-results.json" }],
    ["list"],
  ],

  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 8_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
