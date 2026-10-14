import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4310",
    headless: true,
    launchOptions: { executablePath: process.env["CHROMIUM_PATH"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run server",
    url: "http://127.0.0.1:4310/login",
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
