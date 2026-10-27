import { ChangeDetectionStrategy, Component } from "@angular/core";
@Component({
  selector: "app-help",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="page-heading">
      <div>
        <p class="eyebrow">A TU LADO</p>
        <h1 tabindex="-1">Un poco de ayuda<span class="accent-dot">.</span></h1>
        <p class="muted">Todo lo que necesitas para trabajar con Nexo.</p>
      </div>
    </div>
    <div class="help-grid">
      <section class="panel">
        <span class="step-number">01</span>
        <h2>Tu cuenta y tus permisos</h2>
        <p>
          El Administrador consulta el resumen, da de alta clientes y crea y
          actualiza proyectos. El Usuario estándar consulta su propio registro y sus proyectos
          y descarga sus informes. Desde Mi cuenta puedes editar tus datos y preferencias.
        </p>
        <p>
          La sesión dura una hora. Al caducar, vuelve a iniciar sesión. Para
          salir, utiliza «Cerrar sesión» en la navegación.
        </p>
      </section>
      <section class="panel">
        <span class="step-number">02</span>
        <h2>Clientes y proyectos</h2>
        <p>
          En Clientes, selecciona «Nuevo cliente». Introduce nombre, correo y
          sector. Al salir del campo correo se comprueba si ya está registrado.
          Espera a que termine antes de guardar.
        </p>
        <p>
          En Proyectos, selecciona «Nuevo proyecto», elige cliente, presupuesto
          y fecha. Usa «Actualizar» para cambiar estado y progreso. Pendiente
          corresponde a 0 % y Completado a 100 %.
        </p>
      </section>
      <section class="panel">
        <span class="step-number">03</span>
        <h2>Resumen e informes</h2>
        <p>
          El resumen muestra la actividad reciente y permite descargar un PDF
          con todos los proyectos. La actividad se consulta cada cinco segundos.
        </p>
        <p>
          En Proyectos, combina la búsqueda con el filtro de estado y pulsa CSV
          o PDF. El informe incluye solo los resultados filtrados. El PDF del
          resumen incluye todos los proyectos.
        </p>
      </section>
      <section class="panel">
        <span class="step-number">04</span>
        <h2>Accesibilidad y conexión</h2>
        <p>
          Usa Tab y Mayús + Tab para navegar, Enter para activar enlaces y
          Espacio para botones. «Saltar al contenido» evita repetir el menú.
        </p>
        <p>
          Puedes instalar la PWA desde el menú del navegador cuando esté
          disponible. La interfaz se almacena para futuras visitas, pero iniciar
          sesión y trabajar con datos requiere conexión.
        </p>
      </section>
    </div>
    <aside class="demo-notice">
      <strong>Acerca de esta demostración</strong>
      <p>
        Solo se utilizan datos sintéticos. Los clientes, proyectos y la actividad se guardan en Supabase
        (PostgreSQL) y se conservan al reiniciar el servidor. No introduzcas datos personales reales.
      </p>
    </aside>`,
})
export class HelpPage {}
