import { defineConfig, devices } from "@playwright/test";
import { E2E_API_PORT, E2E_SIGNALING_PORT, E2E_WEB_PORT, e2eEnv } from "./tests/e2e/env.ts";

const env = e2eEnv();

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${E2E_WEB_PORT}`,
    locale: "ja-JP",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/start-api.mjs",
      url: `http://127.0.0.1:${E2E_API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      env,
    },
    {
      command: "pnpm --filter @qwyzm/signaling start",
      url: `http://127.0.0.1:${E2E_SIGNALING_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      env,
    },
    {
      command: "pnpm --filter @qwyzm/web dev",
      url: `http://127.0.0.1:${E2E_WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      env,
    },
  ],
});
