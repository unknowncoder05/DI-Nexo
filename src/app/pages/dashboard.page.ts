import { AuthService } from "../core/auth.service";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { firstValueFrom } from "rxjs";
import { IonSpinner } from "@ionic/angular";
import { DataService } from "../core/data.service";
import { Activity, Client, Project, ProjectStatus } from "../core/models";
import { errorMessage } from "../core/api.interceptor";
import { ChartComponent, ChartDatum } from "../shared/chart.component";
import { ExportService } from "../core/export.service";
@Component({
  selector: "app-dashboard",
  imports: [FormsModule, IonSpinner, ChartComponent],
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
  clientFilter = signal('');
  statusFilter = signal<ProjectStatus | ''>('');
  monthFilter = signal('');
  statuses: ProjectStatus[] = ['Pendiente', 'En curso', 'Completado'];
  activeFilters = computed(() => [this.clientFilter(), this.statusFilter(), this.monthFilter()].filter(Boolean).length);
  reportProjects = computed(() => this.filterProjects());
  reportBudget = computed(() => this.reportProjects().reduce((sum,p) => sum + Math.round(p.budget * 100),0) / 100);
  reportProgress = computed(() => {
    const projects = this.reportProjects();
    return projects.length ? Math.round(projects.reduce((sum,p) => sum + p.progress,0) / projects.length) : 0;
  });
  completed = computed(() => this.reportProjects().filter(p => p.status === 'Completado').length);
  clientOptions = computed(() => {
    const ids = new Set(this.projects().map(p => p.clientId));
    return this.clients().filter(c => ids.has(c.id)).sort((a,b) => a.name.localeCompare(b.name));
  });
  monthOptions = computed(() => this.monthKeys(this.projects()).map(key => ({key,label:this.monthLabel(key)})));
  statusChart = computed<ChartDatum[]>(() => {
    const projects = this.filterProjects(false,true);
    return this.statuses.map((status,index) => ({
      key:status, label:status, value:projects.filter(p => p.status === status).length,
      color:['#d0a33b','#497b94','#6b957b'][index],
    }));
  });
  deliveryChart = computed<ChartDatum[]>(() => {
    const totals = new Map<string, number>();
    for (const project of this.filterProjects(true,false)) {
      const month = project.dueDate.slice(0, 7);
      totals.set(month, (totals.get(month) || 0) + Math.round(project.budget * 100));
    }
    return this.monthKeys(this.filterProjects(true,false)).map(key => ({key,label:this.monthLabel(key),value:(totals.get(key) || 0) / 100}));
  });
  private monthKeys(projects: Project[]): string[] {
    const months = projects.map(p => p.dueDate.slice(0,7)).sort();
    if (!months.length) return [];
    const [firstYear,firstMonth] = months[0].split('-').map(Number);
    const [lastYear,lastMonth] = months[months.length - 1].split('-').map(Number);
    const start = firstYear * 12 + firstMonth - 1, end = lastYear * 12 + lastMonth - 1;
    return Array.from({length:end - start + 1},(_,offset) => {
      const index = start + offset;
      return `${String(Math.floor(index / 12)).padStart(4,'0')}-${String(index % 12 + 1).padStart(2,'0')}`;
    });
  }
  private filterProjects(includeStatus = true, includeMonth = true): Project[] {
    return this.projects().filter(p => (!this.clientFilter() || p.clientId === this.clientFilter()) &&
      (!includeStatus || !this.statusFilter() || p.status === this.statusFilter()) &&
      (!includeMonth || !this.monthFilter() || p.dueDate.startsWith(this.monthFilter())));
  }
  monthLabel(key: string): string {
    return new Intl.DateTimeFormat(this.auth.user()?.locale || 'es-ES', {month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${key}-01T00:00:00Z`));
  }
  currency(value: number): string {
    return new Intl.NumberFormat(this.auth.user()?.locale || 'es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(value);
  }
  clientName(id: string): string { return this.clients().find(c => c.id === id)?.name || 'Sin cliente'; }
  deliveryDate(value: string): string {
    return new Intl.DateTimeFormat(this.auth.user()?.locale || 'es-ES',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
  }
  selectStatus(value: string) {
    if (this.statuses.includes(value as ProjectStatus)) this.statusFilter.set(this.statusFilter() === value ? '' : value as ProjectStatus);
  }
  selectMonth(value: string) { this.monthFilter.set(this.monthFilter() === value ? '' : value); }
  resetFilters() { this.clientFilter.set(''); this.statusFilter.set(''); this.monthFilter.set(''); }
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
      await this.exporter.pdf(this.reportProjects(), this.clients());
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.exporting.set(false);
    }
  }
}
