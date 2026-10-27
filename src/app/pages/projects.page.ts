import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { IonButton, IonSpinner } from "@ionic/angular";
import { AuthService } from "../core/auth.service";
import { DataService } from "../core/data.service";
import { ExportService } from "../core/export.service";
import { Client, Project, ProjectStatus } from "../core/models";
import { errorMessage } from "../core/api.interceptor";
import {
  DataTableComponent,
  TableColumn,
  TableRow,
} from "../shared/data-table.component";
@Component({
  selector: "app-projects",
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IonButton,
    IonSpinner,
    DataTableComponent,
  ],
  templateUrl: "./projects.page.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsPage {
  private data = inject(DataService);
  private exporter = inject(ExportService);
  auth = inject(AuthService);
  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal("");
  notice = signal("");
  showForm = signal(false);
  editing = signal<Project | null>(null);
  status = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get("status") || "",
  );
  query = signal("");
  statuses: ProjectStatus[] = ["Pendiente", "En curso", "Completado"];
  editStatus: ProjectStatus = "Pendiente";
  editProgress = 0;
  form = inject(FormBuilder).nonNullable.group({
    name: [
      "",
      [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    ],
    clientId: ["", Validators.required],
    budget: [
      0,
      [Validators.required, Validators.min(0), Validators.max(10000000)],
    ],
    dueDate: ["", Validators.required],
  });
  columns: TableColumn[] = [
    { key: "name", label: "Proyecto" },
    { key: "client", label: "Cliente" },
    { key: "status", label: "Estado" },
    { key: "budget", label: "Presupuesto" },
    { key: "dueDate", label: "Entrega" },
    { key: "progress", label: "Progreso" },
  ];
  filtered = computed(() =>
    this.projects().filter((p) => !this.status() || p.status === this.status()),
  );
  rows = computed<TableRow[]>(() =>
    this.filtered().map((p) => ({
      id: p.id,
      name: p.name,
      client: this.clients().find((c) => c.id === p.clientId)?.name ?? "",
      status: p.status,
      budget: new Intl.NumberFormat(this.auth.user()?.locale || "es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(p.budget),
      dueDate: p.dueDate,
      progress: `${p.progress} %`,
    })),
  );
  exportProjects = computed(() => {
    const q = this.query().toLocaleLowerCase("es").trim();
    const ids = new Set(
      this.rows()
        .filter((r) =>
          this.columns.some((c) =>
            r[c.key].toLocaleLowerCase("es").includes(q),
          ),
        )
        .map((r) => r.id),
    );
    return this.filtered().filter((p) => ids.has(p.id));
  });
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      const result = await firstValueFrom(this.data.workspace());
      this.clients.set(result.clients);
      this.projects.set(result.projects);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
  async create() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    try {
      const project = await firstValueFrom(
        this.data.addProject(this.form.getRawValue()),
      );
      this.projects.update((items) => [project, ...items]);
      this.showForm.set(false);
      this.form.reset();
      this.notice.set("Proyecto creado correctamente.");
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  edit(id: string) {
    const project = this.projects().find((p) => p.id === id);
    if (project) {
      this.editing.set(project);
      this.editStatus = project.status;
      this.editProgress = project.progress;
      setTimeout(() => document.getElementById("edit-status")?.focus());
    }
  }
  changeStatus() {
    this.editProgress =
      this.editStatus === "Completado"
        ? 100
        : this.editStatus === "Pendiente"
          ? 0
          : Math.min(99, this.editProgress);
  }
  async update() {
    const project = this.editing();
    if (!project || this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    try {
      const updated = await firstValueFrom(
        this.data.updateProject(
          project.id,
          this.editStatus,
          Number(this.editProgress),
        ),
      );
      this.projects.update((items) =>
        items.map((p) => (p.id === updated.id ? updated : p)),
      );
      this.editing.set(null);
      this.notice.set("Proyecto actualizado.");
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  async export(format: "csv" | "pdf") {
    this.busy.set(true);
    this.error.set("");
    try {
      if (format === "csv")
        this.exporter.csv(this.exportProjects(), this.clients());
      else await this.exporter.pdf(this.exportProjects(), this.clients());
      this.notice.set("Informe generado con los filtros actuales.");
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
