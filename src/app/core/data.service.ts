import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { forkJoin, switchMap, timer } from "rxjs";
import { Activity, Client, NewClient, Project, ProjectStatus } from "./models";
/** Adaptadores HTTP asíncronos: REST relacional y snapshots documentales. */
@Injectable({ providedIn: "root" })
export class DataService {
  private http = inject(HttpClient);
  clients() {
    return this.http.get<Client[]>("/api/sql/clients");
  }
  projects() {
    return this.http.get<Project[]>("/api/sql/projects");
  }
  workspace() {
    return forkJoin({ clients: this.clients(), projects: this.projects() });
  }
  activity() {
    return timer(0, 5000).pipe(
      switchMap(() => this.http.get<Activity[]>("/api/nosql/activity")),
    );
  }
  emailAvailable(email: string) {
    return this.http.get<{ available: boolean }>("/api/sql/email-available", {
      params: { email },
    });
  }
  addClient(client: NewClient) {
    return this.http.post<Client>("/api/sql/clients", client);
  }
  addProject(
    project: Pick<Project, "name" | "clientId" | "budget" | "dueDate">,
  ) {
    return this.http.post<Project>("/api/sql/projects", project);
  }
  updateProject(id: string, status: ProjectStatus, progress: number) {
    return this.http.patch<Project>(`/api/sql/projects/${id}`, {
      status,
      progress,
    });
  }
}
