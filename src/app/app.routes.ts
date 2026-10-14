import { Routes } from "@angular/router";
import { authGuard, adminGuard } from "./core/auth.guard";
export const routes: Routes = [
  {
    path: "login",
    title: "Acceso · Nexo",
    loadComponent: () => import("./pages/login.page").then((m) => m.LoginPage),
  },
  {
    path: "dashboard",
    title: "Resumen · Nexo",
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import("./pages/dashboard.page").then((m) => m.DashboardPage),
  },
  {
    path: "projects",
    title: "Proyectos · Nexo",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/projects.page").then((m) => m.ProjectsPage),
  },
  {
    path: "clients",
    title: "Clientes · Nexo",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/clients.page").then((m) => m.ClientsPage),
  },
  {
    path: "help",
    title: "Ayuda · Nexo",
    canActivate: [authGuard],
    loadComponent: () => import("./pages/help.page").then((m) => m.HelpPage),
  },
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  { path: "**", redirectTo: "projects" },
];
