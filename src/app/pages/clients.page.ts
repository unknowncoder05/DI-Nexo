import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { catchError, firstValueFrom, map, of, switchMap, timer } from "rxjs";
import { IonButton, IonSpinner } from "@ionic/angular";
import { DataService } from "../core/data.service";
import { AuthService } from "../core/auth.service";
import { Client } from "../core/models";
import { errorMessage } from "../core/api.interceptor";
import {
  DataTableComponent,
  TableColumn,
  TableRow,
} from "../shared/data-table.component";
@Component({
  selector: "app-clients",
  imports: [ReactiveFormsModule, IonButton, IonSpinner, DataTableComponent],
  templateUrl: "./clients.page.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPage {
  private data = inject(DataService);
  auth = inject(AuthService);
  clients = signal<Client[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  error = signal("");
  notice = signal("");
  columns: TableColumn[] = [
    { key: "full_name", label: "Nombre completo" },
    { key: "display_name", label: "Nombre visible" },
    { key: "email", label: "Correo electrónico" },
    { key: "role", label: "Rol" },
    { key: "phone", label: "Teléfono" },
    { key: "job_title", label: "Puesto" },
    { key: "sector", label: "Sector" },
    { key: "locale", label: "Formato regional" },
    { key: "timezone", label: "Zona horaria" },
    { key: "theme", label: "Tema" },
    { key: "notifications_enabled", label: "Avisos accesibles" },
    { key: "created_at", label: "Creado" },
    { key: "updated_at", label: "Actualizado" },
    { key: "last_login_at", label: "Último acceso" },
    { key: "id", label: "ID" },
  ];
  rows = computed<TableRow[]>(() => this.clients().map((c) => ({
    id: c.id, name: c.name, full_name: c.full_name, display_name: c.display_name,
    email: c.email, role: c.role === 'admin' ? 'Administrador' : 'Usuario estándar',
    phone: c.phone || '—', job_title: c.job_title || '—', sector: c.sector || '—',
    locale: c.locale, timezone: c.timezone,
    theme: {light:'Claro',dark:'Oscuro',system:'Sistema'}[c.theme],
    notifications_enabled: c.notifications_enabled ? 'Sí' : 'No',
    created_at: this.auth.formatDate(c.created_at), updated_at: this.auth.formatDate(c.updated_at),
    last_login_at: this.auth.formatDate(c.last_login_at),
  })));
  /** Angular cancela la validación anterior al cambiar el valor. */
  private uniqueEmail: AsyncValidatorFn = (control) =>
    timer(300).pipe(
      switchMap(() => this.data.emailAvailable(String(control.value))),
      map((result) => (result.available ? null : { emailTaken: true })),
      catchError(() => of({ unavailable: true })),
    );
  form = inject(FormBuilder).nonNullable.group({
    name: [
      "",
      [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    ],
    email: [
      "",
      {
        validators: [
          Validators.required,
          Validators.email,
          Validators.maxLength(254),
        ],
        asyncValidators: [this.uniqueEmail],
        updateOn: "blur",
      },
    ],
    display_name: ["", [Validators.maxLength(60), Validators.pattern(/^(?:\s*|.{2,60})$/)]],
    phone: ["", Validators.maxLength(30)],
    job_title: ["", Validators.maxLength(80)],
    sector: ["Servicios", [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    locale: ["es-ES" as Client['locale']],
    timezone: ["Europe/Madrid" as Client['timezone']],
    theme: ["light" as Client['theme']],
    notifications_enabled: [true],
  });
  constructor() {
    const cdr = inject(ChangeDetectorRef);
    this.form.statusChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => cdr.markForCheck());
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      this.clients.set(await firstValueFrom(this.data.clients()));
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
  async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.form.pending || this.saving()) return;
    this.saving.set(true);
    this.error.set("");
    try {
      const client = await firstValueFrom(
        this.data.addClient(this.form.getRawValue()),
      );
      this.clients.update((items) => [client, ...items]);
      this.form.reset();
      this.showForm.set(false);
      this.notice.set("Cliente creado correctamente.");
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
