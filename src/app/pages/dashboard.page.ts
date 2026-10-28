import { AuthService } from "../core/auth.service";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { firstValueFrom } from "rxjs";
import { IonSpinner } from "@ionic/angular";
import { DataService } from "../core/data.service";
import { Activity, Client, Project } from "../core/models";
import { errorMessage } from "../core/api.interceptor";
import { ChartComponent, ChartDatum } from "../shared/chart.component";
import { ExportService } from "../core/export.service";
@Component({
  selector: "app-dashboard",
  imports: [IonSpinner, ChartComponent],
  templateUrl: "./dashboard.page.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  auth = inject(AuthService);
  private data = inject(DataService);
  private exporter = inject(ExportService);
  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);
  events = signal<Activity[]>([]);
  loading = signal(true);
  error = signal("");
  activityError = signal("");
  exporting = signal(false);
  statusChart = computed<ChartDatum[]>(() => [
    {label:'Pendiente', value:this.projects().filter(p => p.status === 'Pendiente').length, color:'#ba832b'},
    {label:'En curso', value:this.projects().filter(p => p.status === 'En curso').length, color:'#387b73'},
    {label:'Completado', value:this.projects().filter(p => p.status === 'Completado').length, color:'#8a9d45'},
  ]);
  deliveryChart = computed<ChartDatum[]>(() => {
    const totals = new Map<string, number>();
    for (const project of this.projects()) {
      const month = project.dueDate.slice(0, 7);
      totals.set(month, (totals.get(month) || 0) + Math.round(project.budget * 100));
    }
    const months = [...totals.keys()].sort();
    if (!months.length) return [];
    const result: ChartDatum[] = [];
    const [firstYear, firstMonth] = months[0].split('-').map(Number);
    const [lastYear, lastMonth] = months[months.length - 1].split('-').map(Number);
    // Completar los meses intermedios evita unir períodos sin entregas como si fueran consecutivos.
    for (let index = firstYear * 12 + firstMonth - 1; index <= lastYear * 12 + lastMonth - 1; index++) {
      const year = Math.floor(index / 12), month = index % 12;
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      result.push({
        label:new Intl.DateTimeFormat(this.auth.user()?.locale || 'es-ES', {month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1))),
        value:(totals.get(key) || 0) / 100,
      });
    }
    return result;
  });
  constructor() {
    void this.load();
    this.data
      .activity()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (events) => this.events.set(events),
        error: (e) => this.activityError.set(errorMessage(e)),
      });
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
  async export() {
    this.exporting.set(true);
    try {
      await this.exporter.pdf(this.projects(), this.clients());
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.exporting.set(false);
    }
  }
}
