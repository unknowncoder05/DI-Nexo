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
test("administrador: resumen, validación asíncrona, altas e informes", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Resumen", exact: true }),
  ).toBeVisible();
  await expect(page.locator('app-chart')).toHaveCount(2);
  await expect(page.locator('app-chart canvas')).toHaveCount(2);
  for(const canvas of await page.locator('app-chart canvas').all()) {
    await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
      element.getContext('2d')!.getImageData(0,0,element.width,element.height).data.some((value,index) => index % 4 === 3 && value > 0)
    )).toBe(true);
  }
  await page.getByText('Ver datos de Proyectos por estado',{exact:true}).click();
  const statusChart=page.locator('app-chart').first();
  await expect(statusChart.getByRole('row',{name:'Pendiente 2',exact:true})).toBeVisible();
  await expect(statusChart.getByRole('row',{name:'En curso 3',exact:true})).toBeVisible();
  await expect(statusChart.getByRole('row',{name:'Completado 1',exact:true})).toBeVisible();
  await page.getByText('Ver datos de Presupuesto por mes de entrega',{exact:true}).click();
  const budgetChart=page.locator('app-chart').nth(1);
  for(const value of [/6200/,/18\.000/,/35\.800/]) await expect(budgetChart.getByRole('cell',{name:value})).toBeVisible();
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(page.getByRole('columnheader')).toHaveCount(15);
  await page.getByRole("button", { name: "+ Nuevo cliente" }).click();
  await page.getByLabel("Nombre del cliente").fill("Cliente E2E");
  await page.getByLabel('Nombre visible',{exact:true}).fill('Cliente visible');
  await page.getByLabel('Teléfono',{exact:true}).fill('+34 611 222 333');
  await page.getByLabel('Puesto',{exact:true}).fill('Diseñador');
  await page.getByLabel('Formato de fechas e importes').selectOption('en-GB');
  await page.getByLabel('Zona horaria').selectOption('UTC');
  await page.getByLabel('Tema',{exact:true}).selectOption('dark');
  await page.getByLabel('Anunciar cambios de actividad').uncheck();
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
  await page.reload();
  const clientRow=page.getByRole('row').filter({hasText:'Cliente E2E'});
  await expect(clientRow.getByRole('cell')).toHaveCount(15);
  for(const value of ['Cliente visible','+34 611 222 333','Diseñador','en-GB','UTC','Oscuro','No','Usuario estándar']) {
    await expect(clientRow.getByRole('cell',{name:value,exact:true})).toBeVisible();
  }
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
  await page.getByRole("heading", { name: "Actividad reciente", exact: true }).waitFor();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(
    page.getByRole("link", { name: "Clientes", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Mostrar navegación" }).click();
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(page.getByRole('columnheader')).toHaveCount(15);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
test('mi cuenta: preferencias persistidas y datos de acceso', async ({ page }) => {
  await login(page,false);
  await page.getByRole('link',{name:'Mi cuenta',exact:true}).click();
  await page.getByLabel('Nombre completo',{exact:true}).fill('Usuario de prueba');
  await page.getByLabel('Nombre visible en el menú').fill('Mi perfil');
  await page.getByLabel('Teléfono',{exact:true}).fill('+34 600 000 000');
  await page.getByLabel('Puesto',{exact:true}).fill('Desarrollo');
  await page.getByLabel('Sector',{exact:true}).fill('Tecnología');
  await page.getByLabel('Formato de fechas e importes').selectOption('en-GB');
  await page.getByLabel('Zona horaria').selectOption('UTC');
  await page.getByLabel('Tema',{exact:true}).selectOption('dark');
  await page.getByLabel('Anunciar cambios de actividad').uncheck();
  await page.getByRole('button',{name:'Guardar perfil'}).click();
  await expect(page.getByText('Perfil actualizado.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload();
  await expect(page.getByLabel('Nombre completo',{exact:true})).toHaveValue('Usuario de prueba');
  await expect(page.getByLabel('Teléfono',{exact:true})).toHaveValue('+34 600 000 000');
  await expect(page.getByLabel('Anunciar cambios de actividad')).not.toBeChecked();
  await expect(page.getByRole('heading',{name:'Datos de acceso'})).toBeVisible();
});

test('resumen: meses sin entregas y datos vacíos', async ({page}) => {
  let projects = [
    {id:'gap-1',name:'Enero',clientId:'c1',budget:100,status:'Pendiente',dueDate:'2027-01-15',progress:0},
    {id:'gap-2',name:'Marzo',clientId:'c1',budget:300,status:'Pendiente',dueDate:'2027-03-15',progress:0},
  ];
  await page.route('**/api/sql/projects', route => route.fulfill({json:projects}));
  await login(page);
  await expect(page.locator('app-chart canvas')).toHaveCount(2);
  await page.getByText('Ver datos de Presupuesto por mes de entrega',{exact:true}).click();
  const budget=page.locator('app-chart').nth(1);
  await expect(budget.getByRole('row',{name:/feb.*0/})).toBeVisible();
  projects=[];
  await page.reload();
  await expect(page.getByText('No hay datos con valores mayores que cero para este gráfico.',{exact:true})).toHaveCount(2);
  await expect(page.locator('app-chart canvas')).toHaveCount(0);
});

test('informe: filtros vinculados, selección por gráfico y PDF filtrado', async ({page}) => {
  const projects=[
    {id:'r1',name:'Alpha',clientId:'c1',budget:100,status:'Pendiente',dueDate:'2027-01-15',progress:0},
    {id:'r2',name:'Beta',clientId:'c1',budget:300,status:'En curso',dueDate:'2027-03-15',progress:50},
    {id:'r3',name:'Gamma',clientId:'c2',budget:600,status:'Completado',dueDate:'2027-03-20',progress:100},
  ];
  await page.route('**/api/sql/projects',route=>route.fulfill({json:projects}));
  await login(page);
  const count=page.getByTestId('report-count');
  const budget=page.getByTestId('report-budget');
  await expect(count).toContainText('3');
  await page.getByLabel('Cliente',{exact:true}).selectOption('c1');
  await expect(count).toContainText('2');
  await expect(budget).toContainText('400');
  await page.getByRole('button',{name:'Filtrar por En curso',exact:true}).click();
  await expect(page.getByLabel('Estado',{exact:true})).toHaveValue('En curso');
  await expect(count).toContainText('1');
  await expect(budget).toContainText('300');
  await page.getByRole('button',{name:'Filtrar por En curso',exact:true}).click();
  await expect(count).toContainText('2');
  await page.getByRole('button',{name:'Restablecer filtros'}).click();
  await expect(count).toContainText('3');
  await page.getByText('Ver datos de Presupuesto por mes de entrega',{exact:true}).click();
  await page.locator('app-chart').nth(1).getByRole('button',{name:/mar.*2027/}).click();
  await expect(page.getByLabel('Mes de entrega',{exact:true})).toHaveValue('2027-03');
  await expect(count).toContainText('2');
  await expect(budget).toContainText('900');
  await page.getByRole('button',{name:'Filtrar por Completado',exact:true}).click();
  await expect(count).toContainText('1');
  const table=page.getByRole('table',{name:'Proyectos de la selección',exact:true});
  await expect(table.getByText('Gamma',{exact:true})).toBeVisible();
  await expect(table.getByText('Alpha',{exact:true})).toHaveCount(0);
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Descargar informe',exact:true}).click();
  const download=await pending;
  const pdf=readFileSync((await download.path())!).toString('latin1');
  expect(pdf).toContain('Gamma');expect(pdf).not.toContain('Alpha');expect(pdf).not.toContain('Beta');
  await page.getByLabel('Cliente',{exact:true}).selectOption('c1');
  await expect(table.getByText('No hay proyectos con estos filtros. Prueba otra selección.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Descargar informe',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Restablecer filtros'}).click();
  await expect(count).toContainText('3');
  await page.getByLabel('Mes de entrega',{exact:true}).selectOption('2027-02');
  await expect(count).toContainText('0');
  await expect(table.getByText('No hay proyectos con estos filtros. Prueba otra selección.')).toBeVisible();
});
