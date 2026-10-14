import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const env = { ...parseEnv(readFileSync(".env", "utf8")), ...process.env };
async function login(page: import("@playwright/test").Page, admin = true) {
  await page.goto("/login");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(admin ? "admin@nexo.example" : "usuario@nexo.example");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(env[admin ? "ADMIN_PASSWORD" : "USER_PASSWORD"]!);
  await page.getByRole("button", { name: "Entrar al espacio" }).click();
  await expect(page).toHaveURL(admin ? /dashboard/ : /projects/);
}
test("administrador: métricas, validación asíncrona, altas e informes", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Todo en perspectiva." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "+ Nuevo cliente" }).click();
  await page.getByLabel("Nombre del cliente").fill("Cliente E2E");
  const email = page.getByLabel("Correo electrónico", { exact: true });
  await email.fill("hola@horizonte.example");
  await email.press("Tab");
  await expect(page.getByText("Este correo ya está registrado.")).toBeVisible();
  await email.fill(`test-${Date.now()}@nexo.example`);
  await email.press("Tab");
  await expect(page.getByText("Comprobando disponibilidad…")).toBeHidden();
  await page
    .getByRole("button", { name: "Guardar cliente", exact: true })
    .click();
  await expect(page.getByText("Cliente creado correctamente.")).toBeVisible();
  await page.getByRole("link", { name: "Proyectos", exact: true }).click();
  await page.getByRole("button", { name: "+ Nuevo proyecto" }).click();
  await page.getByLabel("Nombre del proyecto").fill("Proyecto E2E");
  await page
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: "Cliente E2E" });
  await page.getByLabel("Presupuesto (€)").fill("900");
  await page.getByLabel("Fecha de entrega").fill("2026-12-30");
  await page
    .getByRole("button", { name: "Crear proyecto", exact: true })
    .click();
  await expect(page.getByText("Proyecto creado correctamente.")).toBeVisible();
  await page
    .getByRole("button", { name: "Actualizar Proyecto E2E", exact: true })
    .click();
  await page.locator("#edit-status").selectOption("Completado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Proyecto actualizado.")).toBeVisible();
  await page.getByRole("searchbox").fill("Proyecto E2E");
  await expect(page.getByText("1 resultados")).toBeVisible();
  for (const format of ["CSV", "PDF"]) {
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `↓ ${format}`, exact: true })
      .click();
    expect((await download).suggestedFilename()).toBe(
      `nexo-proyectos.${format.toLowerCase()}`,
    );
  }
  expect(failures).toEqual([]);
});
test("usuario estándar: rutas protegidas y permisos de lectura", async ({
  page,
}) => {
  await login(page, false);
  await expect(
    page.getByRole("button", { name: "+ Nuevo proyecto" }),
  ).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/projects/);
  await expect(
    page.getByRole("link", { name: "Resumen", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/clients");
  await expect(page).toHaveURL(/login/);
});
test("móvil: menú, adaptación y navegación por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(
    page.getByRole("link", { name: "Clientes", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Mostrar navegación" }).click();
  await page.getByRole("link", { name: "Ayuda", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Un poco de ayuda." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.locator("footer")).toBeInViewport();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveCount(1);
});
