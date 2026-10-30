# Memoria técnica de Nexo

**Autor:** Yerson Lasso

**Módulo:** Desarrollo de Interfaces, DAM

**Fecha:** 30 de octubre de 2026

## Descripción

Nexo es una aplicación web para gestionar clientes y proyectos. Permite consultar registros, crear clientes, actualizar proyectos, editar el perfil y descargar informes PDF y CSV. Dispone de dos roles: administrador y usuario estándar.

## Tecnologías y organización

El frontend utiliza Angular 22, Ionic 9 y TypeScript. El backend utiliza Node.js y Express. Supabase proporciona la autenticación y la base de datos PostgreSQL. Los gráficos se generan con Chart.js 4.6.1 y la infraestructura de Supabase se configura con Terraform. El proyecto está configurado para Node.js 24.

El código separa las páginas, las plantillas HTML, los modelos y los servicios. Las páginas son Acceso, Resumen, Clientes, Proyectos, Mi cuenta y Ayuda. Las rutas se cargan bajo demanda y se protegen según el rol.

Los servicios de autenticación, datos y exportación centralizan las operaciones compartidas. Los componentes reutilizables son la tabla de datos y el gráfico. El estado de la interfaz se gestiona con señales de Angular y las peticiones asíncronas con RxJS.

## Funciones principales

Clientes muestra los 15 campos del registro unificado de usuarios y clientes. Permite buscar, ordenar y crear registros. El formulario comprueba si el correo ya existe antes de guardar.

Proyectos permite buscar, filtrar por estado y exportar los resultados. El administrador puede crear proyectos y modificar su estado y progreso. Pendiente exige un progreso del 0 % y Completado del 100 %.

El resumen presenta indicadores de proyectos, presupuesto, avance medio y completados. Incluye un gráfico de anillo por estado y uno de líneas con el presupuesto planificado por mes de entrega. Los filtros de cliente, estado y mes actualizan los indicadores, el detalle y el PDF. También se puede filtrar seleccionando datos en los gráficos.

Mi cuenta permite editar los datos personales y elegir tema, formato regional, zona horaria y avisos accesibles. La interfaz se adapta al móvil e incluye etiquetas, navegación por teclado y tablas alternativas para consultar los datos de los gráficos.

## Base de datos y seguridad

La aplicación utiliza tres tablas principales:

- `nexo_users`: usuarios y clientes en una misma tabla de 15 columnas, con datos personales, rol, preferencias y fechas de acceso y actualización.
- `nexo_projects`: proyectos, cliente asociado, presupuesto, estado, progreso y fecha de entrega.
- `nexo_activity`: actividad guardada como documentos JSONB en PostgreSQL y generada mediante triggers.

Supabase Auth verifica el acceso. El administrador consulta todos los clientes y proyectos. El usuario estándar solo consulta su registro y sus proyectos. Ambos pueden editar su propio perfil.

Las políticas RLS aplican estos permisos en la base de datos. Las consultas utilizan el token del usuario. Los privilegios por columna impiden modificar el rol y las fechas desde el cliente. La sesión utiliza una cookie HttpOnly y Secure en producción. Las credenciales se guardan en `.env`, excluido de Git.

## Ejecución y despliegue

Con Node.js 24 y npm 11 o 12, desde `actividad-1`:

```bash
npm ci
npm run setup
# Configurar .env siguiendo .env.example
make start
make stop
```

`make start` inicia Angular y la API en segundo plano. La aplicación local está en `http://localhost:4200`. `make stop` detiene ambos procesos. Las migraciones SQL están en `supabase/migrations/` y se aplican con `npm run db:setup`.

La aplicación está publicada en Vercel y en el servidor de sandbox, donde Nginx y systemd gestionan el acceso HTTPS y el proceso Node. La PWA conserva los recursos de interfaz; el acceso y las operaciones con datos requieren conexión.

## Pruebas y documentación

La versión funcional superó 17 pruebas de API y PostgreSQL y 6 pruebas de navegador. Se comprobaron los permisos, los formularios, los filtros del resumen, el PDF filtrado, los datos vacíos y la adaptación móvil. GitHub Actions ejecuta las comprobaciones del proyecto.

El código se gestiona con Git mediante las ramas `main`, `develop` y `feature`. Compodoc genera la documentación técnica. El manual de uso está en el README y en la sección Ayuda.

**Repositorio:** https://github.com/unknowncoder05/DI-Nexo

**Aplicación:** https://sandbox.yerson.co/di/a1/
