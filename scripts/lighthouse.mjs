import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
const env = { ...parseEnv(await readFile(".env", "utf8")), ...process.env };
const base = process.env.AUDIT_URL || "http://localhost:4310";
const chrome = await launch({
  chromePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
  chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
});
const browser = await chromium.connectOverCDP(
  `http://localhost:${chrome.port}`,
);
const context = browser.contexts()[0];
let valid = true;
await mkdir("artifacts/lighthouse", { recursive: true });
try {
  for (const route of ["login", "dashboard"]) {
    if (route === "dashboard") {
      const page = await context.newPage();
      await page.goto(`${base}/login`);
      await page
        .getByLabel("Correo electrónico", { exact: true })
        .fill("admin@nexo.example");
      await page
        .getByLabel("Contraseña", { exact: true })
        .fill(env.ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Entrar al espacio" }).click();
      await page.waitForURL("**/dashboard");
      await page.close();
    }
    const result = await lighthouse(`${base}/${route}`, {
      port: chrome.port,
      output: ["html", "json"],
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices"],
      disableStorageReset: true,
    });
    await writeFile(`artifacts/lighthouse/${route}.html`, result.report[0]);
    await writeFile(`artifacts/lighthouse/${route}.json`, result.report[1]);
    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([key, value]) => [
        key,
        Math.round(value.score * 100),
      ]),
    );
    console.log(route, scores);
    for (const id of ["accessibility", "best-practices"])
      if (scores[id] < 90) valid = false;
    if (!result.lhr.finalDisplayedUrl.includes(`/${route}`)) {
      valid = false;
      console.error("La auditoría no terminó en la ruta esperada.");
    }
  }
} finally {
  await browser.close();
  await chrome.kill();
}
if (!valid) process.exitCode = 1;
