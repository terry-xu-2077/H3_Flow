import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.SHOTMILL_E2E_BASE_URL ?? "http://127.0.0.1:1420",
    trace: "retain-on-failure",
  },
  webServer: process.env.SHOTMILL_E2E_EXTERNAL_SERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://127.0.0.1:1420/dev/ui",
        reuseExistingServer: true,
      },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
});
