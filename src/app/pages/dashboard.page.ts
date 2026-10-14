import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { IonSpinner } from '@ionic/angular/standalone';
import { DataService } from '../core/data.service';
import { Activity, Client, Project } from '../core/models';
import { errorMessage } from '../core/api.interceptor';
import { ExportService } from '../core/export.service';
import { StatCardComponent } from '../shared/stat-card.component';
import { ChartComponent } from '../shared/chart.component';
@Component({ selector: 'app-dashboard', imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, IonSpinner, StatCardComponent, ChartComponent], templateUrl: './dashboard.page.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class DashboardPage {
  private data = inject(DataService); private exporter = inject(ExportService); router = inject(Router);
  clients = signal<Client[]>([]); projects = signal<Project[]>([]); events = signal<Activity[]>([]);
  loading = signal(true); error = signal(''); activityError = signal(''); exporting = signal(false); selectedClient = signal('');
  filtered = computed(() => this.projects().filter(p => !this.selectedClient() || p.clientId === this.selectedClient()));
  budget = computed(() => this.filtered().reduce((sum, p) => sum + p.budget, 0));
  active = computed(() => this.filtered().filter(p => p.status === 'En curso').length);
  completed = computed(() => this.filtered().filter(p => p.status === 'Completado').length);
  chartClients = computed(() => this.clients().filter(c => !this.selectedClient() || c.id === this.selectedClient()));
  labels = computed(() => this.chartClients().map(c => c.name));
  values = computed(() => this.chartClients().map(c => this.filtered().filter(p => p.clientId === c.id).reduce((sum, p) => sum + p.budget, 0)));
  description = computed(() => this.labels().map((label, i) => `${label}: ${this.values()[i].toLocaleString('es-ES')} €`).join(' · ') || 'No hay datos para este filtro.');
  constructor() { void this.load(); this.data.activity().pipe(takeUntilDestroyed()).subscribe({ next: events => this.events.set(events), error: e => this.activityError.set(errorMessage(e)) }); }
  async load() { this.loading.set(true); this.error.set(''); try { const result = await firstValueFrom(this.data.dashboard()); this.clients.set(result.clients); this.projects.set(result.projects); } catch(e) { this.error.set(errorMessage(e)); } finally { this.loading.set(false); } }
  async export() { this.exporting.set(true); try { await this.exporter.pdf(this.filtered(), this.clients()); } catch(e) { this.error.set(errorMessage(e)); } finally { this.exporting.set(false); } }
}
