import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4310",
    headless: true,
    serviceWorkers: "block", // Permite interceptar datos de prueba sin que la PWA capture las peticiones.
    launchOptions: { executablePath: process.env["CHROMIUM_PATH"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node --env-file=.env tests/fixtures/server.mjs",
    url: "http://127.0.0.1:4310/login",
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
