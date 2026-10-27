import { AuthService } from "../core/auth.service";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { firstValueFrom } from "rxjs";
import { IonSpinner } from "@ionic/angular";
import { DataService } from "../core/data.service";
import { Activity, Client, Project } from "../core/models";
import { errorMessage } from "../core/api.interceptor";
import { ExportService } from "../core/export.service";
@Component({
  selector: "app-dashboard",
  imports: [IonSpinner],
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
