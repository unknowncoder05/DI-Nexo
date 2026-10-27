# Nexo — Actividad individual 1

Proyecto de Desarrollo de Interfaces (0488). Aplicación de gestión empresarial con **Ionic 9 + Angular 22**, preparada como PWA. Solo utiliza datos sintéticos.

## Requisitos y ejecución

- Node **26.11.1** (`nvm install && nvm use`).
- npm **12**.

```bash
npm ci
npm run setup
# Completa .env según .env.example
npm run db:plan
npm run db:setup
npm run db:users
npm start
```

Abre http://localhost:4200. Angular se ejecuta en el puerto 4200 y la API en el 4310; el proxy conecta ambos. `npm run setup` genera `.env` con contraseñas aleatorias para el aprovisionamiento inicial. El archivo está excluido de Git.

| Cuenta | Rol | Contraseña |
| --- | --- | --- |
| `admin@nexo.example` | Administrador | Valor de `ADMIN_PASSWORD` en `.env` |
| `usuario@nexo.example` | Usuario estándar | Valor de `USER_PASSWORD` en `.env` |

No subas `.env` ni las credenciales al repositorio. Las credenciales de prueba de la instancia desplegada deben indicarse en el PDF privado de entrega.

```bash
npm run build       # PWA optimizada en dist/nexo/browser
npm run server      # API y compilación en http://localhost:4310
npm test            # Pruebas de API y autorización
npm run test:e2e    # Flujos completos con Playwright (requiere build)
npm run docs        # Documentación Compodoc en documentation/
npm run check       # API, build y documentación
```

En sistemas antiguos puedes definir `CHROMIUM_PATH` con la ruta de un Chromium compatible ya instalado.

Para E2E, instala el navegador una vez: `npx playwright install chromium`. Para probar la PWA, utiliza la compilación y `npm run server`; el servidor de desarrollo no registra el service worker. En un alojamiento HTTPS define `NODE_ENV=production` para activar cookies Secure. El script `preview` también activa ese modo y está destinado a un entorno HTTPS o localhost compatible.

## Manual de usuario

1. **Acceso.** Introduce correo y contraseña. La sesión dura una hora; al caducar, vuelve a entrar. «Cerrar sesión» elimina la cookie de sesión del navegador.
2. **Navegación.** El menú lateral muestra Resumen (solo administrador), Proyectos, Clientes, Mi cuenta y Ayuda. En móvil, abre el menú con el botón de navegación.
3. **Clientes.** El administrador ve todos los clientes; cada usuario estándar ve únicamente su propio registro. El administrador puede pulsar «Nuevo cliente», introducir nombre, correo, sector, nombre visible, teléfono, puesto y preferencias de formato, zona horaria, tema y avisos. La tabla muestra las 15 columnas del registro unificado con desplazamiento horizontal. ID, rol y fechas son de solo lectura. Al salir del campo de correo se verifica su disponibilidad contra la API. Si falla la conexión se permite repetir la comprobación.
4. **Proyectos.** El administrador consulta todos los proyectos y el cliente solo los suyos; ambos pueden buscar, filtrar por estado y exportar. El administrador puede dar de alta un proyecto con cliente, presupuesto y fecha, y actualizar su estado/progreso. Pendiente exige 0 %, Completado exige 100 %.
5. **Resumen.** El administrador consulta la actividad reciente y descarga un PDF con todos los proyectos. La actividad se refresca cada cinco segundos.
6. **Informes.** CSV y PDF incluyen los proyectos que coinciden con la búsqueda y el estado seleccionado. CSV está codificado en UTF-8 con BOM y separado por punto y coma. El PDF contiene una tabla paginada con cabeceras.
7. **Teclado.** Tab y Mayús + Tab desplazan el foco; Enter activa enlaces y Espacio botones. Usa «Saltar al contenido» para evitar el menú. Las tablas admiten desplazamiento horizontal con teclado.
8. **Instalación.** Usa «Instalar aplicación» en el navegador compatible después de acceder por HTTPS. La interfaz está cacheada, pero autenticación y datos requieren conexión. Las respuestas de la API no se almacenan en la caché PWA.
9. **Errores.** Las vistas muestran estados de carga, errores y opciones de reintento. No cierres el formulario mientras se comprueba el correo. Si la sesión caduca, inicia sesión de nuevo.

La misma ayuda está integrada en `/help`.

## Arquitectura y correspondencia con el PDF

Patrón MVVM: modelos tipados; servicios de autenticación, datos y exportación; componentes/páginas como modelos de vista; plantillas declarativas separadas. Signals de solo lectura para sesión, señales locales y valores derivados con `computed`. Componentes con `OnPush`.

| Requisito | Implementación |
| --- | --- |
| 1.1 Navegación, lazy loading, roles | `app.routes.ts`, `auth.guard.ts`, `auth.service.ts`, menú global |
| 1.2 Formularios y validación asíncrona | Formularios reactivos de login, clientes y proyectos; `email-available`; `ngModel` en búsqueda y filtros |
| 2.1–2.2 Componentes y eventos | `DataTableComponent` con inputs/outputs. Las tarjetas y el gráfico se retiraron a petición del usuario; ya no se cubre el mínimo de dos componentes reutilizables. |
| 3.1 Datos asíncronos duales | REST `/api/sql/*`; colección `/api/nosql/activity`; `forkJoin`, snapshots periódicos RxJS |
| 3.2 Dashboard administrador | Resumen simplificado sin gráficos ni indicadores, a petición del usuario. El requisito gráfico del PDF ya no está cubierto. |
| 3.3 PDF y CSV | `ExportService`, jsPDF y AutoTable cargados bajo demanda |
| 4.1–4.2 Responsive y accesibilidad | Grid/flex, menú móvil, labels, foco visible, semántica, avisos; auditoría Lighthouse |
| 5.1 Git | `main`, `develop` y ramas de características, commits de trabajo reales |
| 5.2 Documentación | Compodoc y manual integrado en README y Ayuda |
| 5.3 CI/CD y PWA | GitHub Actions, configuración Vercel, manifiesto y Angular service worker |

### Supabase, tablas y permisos

Express utiliza Supabase Auth y PostgreSQL. Cada consulta REST lleva la clave publicable y el JWT del usuario, por lo que RLS se aplica también al acceder directamente a Supabase. La cookie de sesión es HttpOnly/SameSite, Secure en producción; los tokens no se guardan en localStorage. La clave secreta se usa únicamente para aprovisionar cuentas con `npm run db:users`.

Usuarios y clientes son la misma entidad: **`public.nexo_users`**, con exactamente 15 columnas. `auth.users` es la tabla interna de credenciales de Supabase, no otra tabla de clientes. Los clientes existentes conservan sus proyectos. Al aprovisionar una identidad Auth cuyo correo ya existe, se enlaza el mismo registro y se actualizan las referencias de sus proyectos, sin duplicar al cliente.

| Columnas | Uso |
| --- | --- |
| `id`, `email` | Identidad, acceso y relación con proyectos; visibles en Mi cuenta |
| `full_name`, `display_name` | Nombre en Clientes/informes y nombre visible en el menú |
| `role` | Permisos de administrador o usuario estándar |
| `phone`, `job_title`, `sector` | Datos editables del perfil; sector también en Clientes |
| `locale`, `timezone` | Formato de importes y fechas |
| `theme` | Tema claro, oscuro o del sistema |
| `notifications_enabled` | Anuncios de actividad para lectores de pantalla |
| `created_at`, `updated_at`, `last_login_at` | Fechas visibles en Mi cuenta, gestionadas por la base de datos |

RLS permite al usuario leer y actualizar únicamente su perfil y leer sus proyectos. Administración puede leer todos los usuarios/clientes, crear clientes y proyectos y modificar estado/progreso de proyectos. Ningún cliente HTTP puede modificar `role`, `id`, `email` ni las fechas del perfil: se restringen también los permisos por columna. No se permite borrar registros desde la API. El registro global de actividad solo es visible para administración, y sus entradas las generan triggers. Usuarios anónimos no tienen acceso a ninguna tabla. El registro público de cuentas está desactivado con Terraform.

La actividad se conserva en `nexo_activity.payload` (JSONB de PostgreSQL): no hay una segunda base NoSQL. La ruta `/api/nosql/activity` mantiene el contrato documental de la interfaz. Se consulta cada cinco segundos; no utiliza sockets. Los datos persisten entre reinicios.

### Comandos de infraestructura y base de datos

Configura las variables de `.env.example` en `.env` (archivo privado). Terraform necesita `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORGANIZATION_ID` y `SUPABASE_DB_PASSWORD`. Para el proyecto ya existente, configura también `SUPABASE_PROJECT_REF`. Copia `infra/supabase/terraform.tfvars.example` a `infra/supabase/terraform.tfvars` y ajusta nombre/región. No combines ese archivo con un `terraform.tfvars.json` local existente: utiliza solo uno.

```bash
npm run infra -- init
npm run infra -- plan
npm run infra -- apply
npm run db:plan    # Vista previa sin modificar tablas
npm run db:setup   # Aplica las migraciones pendientes, sin reiniciar la base
npm run db:users   # Crea las cuentas iniciales; conserva sus contraseñas si existen
npm run db:verify  # Comprueba RLS real con ambas cuentas y restaura el teléfono de prueba
```

Los comandos reproducibles están en **`scripts/database.mjs`**. El SQL completo, incluyendo tablas, migración de datos, grants, triggers y RLS, está versionado en **`supabase/migrations/`** y se ejecuta en orden. No se modifican migraciones ya aplicadas. `supabase/seed.sql` contiene datos sintéticos opcionales para una instalación vacía; no se ejecuta en cada arranque ni al aplicar las migraciones habituales.

Terraform gestiona el proyecto y la configuración de Auth. El esquema SQL se gestiona con Supabase CLI 2.122.0. El estado local de Terraform contiene información privada: está excluido de Git, debe guardarse de forma segura y no deben administrarse dos copias del mismo estado simultáneamente. El proyecto tiene `prevent_destroy` y la contraseña importada no se rota automáticamente.

Las pruebas de PostgreSQL en `tests/schema.test.mjs` ejecutan las migraciones y comprueban 15 columnas, unificación, enlaces de proyectos y aislamiento entre usuarios. E2E utiliza datos aislados y no modifica Supabase.

## Documentación técnica

`npm run docs` genera `documentation/index.html`. Compodoc documenta componentes, servicios y modelos de Angular. La estructura de API está descrita arriba y los contratos se prueban en `tests/api.test.mjs`. CI publica la documentación como artefacto descargable.

## Accesibilidad y Lighthouse

Con el servidor de la compilación activo en `http://localhost:4310`:

```bash
npm run audit:lighthouse
```

La auditoría local final del 14/10/2026 obtuvo 100 en Accessibility y 100 en Best Practices en ambas rutas. Los valores de rendimiento fueron 70 en login y 81 en resumen. Los resultados concretos y la fecha se conservan en los informes.

Genera informes HTML/JSON en `artifacts/lighthouse/` para login y resumen autenticado, y comprueba un mínimo de 90 en Accessibility y Best Practices. El script necesita Chromium de Playwright instalado. Los informes son evidencias de esa ejecución, no sustituyen la revisión manual de teclado y lector de pantalla.

## CI/CD y despliegue

El workflow ejecuta instalación reproducible, tests de API, build, Compodoc y E2E antes de permitir el despliegue. La aplicación está publicada en https://sandbox.yerson.co/di/a1/ mediante Nginx y el servicio `nexo-a1`.

Para completar la entrega:

1. Crea un repositorio GitHub vacío y añade su URL como `origin`. Publica `main`, `develop` y las ramas de características. No inventes historia ni atribuyas a otra persona los cambios.
2. Si prefieres alojarlo en Vercel, importa el repositorio. `vercel.json` define la salida Angular y la función API. Configura `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `NODE_ENV=production` en las variables privadas del alojamiento.
3. Para el despliegue mediante Actions, configura los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` y la variable de repositorio `VERCEL_ENABLED=true`. Desactiva los despliegues Git automáticos del proveedor si quieres que únicamente el pipeline validado despliegue.
4. Comprueba ambas cuentas, rutas, exportación y PWA sobre la URL real. Ejecuta una nueva auditoría sobre el despliegue; la auditoría local no certifica el alojamiento.
5. Añade al PDF la URL del repositorio, URL de producción, credenciales de prueba, evidencias Lighthouse y enlace a documentación/manual. Comprime **solo ese PDF** con el nombre `APELLIDOS_NOMBRE_DI_PROYECTO.zip`.

**Pendiente externo:** repositorio remoto y PDF/ZIP final. No se generan URLs ni evidencias de publicación ficticias. El enunciado exige repositorio accesible y producción funcional para evaluar la entrega.

## Alojamiento en sandbox.yerson.co

- URL: https://sandbox.yerson.co/di/a1/ (`/di/a1` redirige a la ruta con barra).
- Angular admite `sandbox.yerson.co` en `allowedHosts`.
- `npm run build:sandbox` genera `dist/nexo-sandbox/browser` con base `/di/a1/`. La compilación local habitual conserva base `/`.
- Nginx utiliza `deploy/nginx.conf` dentro del servidor HTTPS existente y envía esta ruta al proceso local `127.0.0.1:4311`.
- El servicio persistente está definido en `deploy/nexo-a1.service`; utiliza Node 26 en `.runtime/node` (binario local excluido de Git) y las credenciales de `.env`.
- La API se llama bajo `/di/a1/api/`; la cookie Secure/HttpOnly queda limitada a `/di/a1/`. El manifiesto y el service worker usan el mismo ámbito.
- Estado y logs: `sudo systemctl status nexo-a1` y `sudo journalctl -u nexo-a1`.
- Después de modificar la API: `sudo systemctl restart nexo-a1`. Después de modificar la interfaz: `npm run build:sandbox`.

Verificado por HTTPS: redirección, recursos, recarga de rutas internas, inicio de sesión, carga del dashboard, navegación y cierre de sesión.

## Referencias

- [Compatibilidad de Angular](https://angular.dev/reference/versions)
- [Configuración de Ionic Angular](https://ionicframework.com/docs/developing/config)
