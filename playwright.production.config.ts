import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: ["live.spec.ts", "privacy.spec.ts", "diagnostics.spec.ts"],
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ["--no-sandbox", "--disable-gpu"],
    },
  },
  webServer: {
    command: "npm run preview -- --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: false,
  },
});
