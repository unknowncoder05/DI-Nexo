/** Contratos compartidos por las vistas y los servicios de datos. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  full_name: string;
  display_name: string;
  phone: string;
  job_title: string;
  sector: string;
  locale: "es-ES" | "en-GB";
  timezone: "Europe/Madrid" | "UTC" | "America/Bogota";
  theme: "light" | "dark" | "system";
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}
/** El cliente comparte las 15 columnas del perfil; name es un alias para informes. */
export interface Client extends User {}
export type NewClient = Pick<Client, "name" | "email" | "sector"> &
  Partial<Pick<Client, "display_name" | "phone" | "job_title" | "locale" | "timezone" | "theme" | "notifications_enabled">>;
export type ProjectStatus = "Pendiente" | "En curso" | "Completado";
export interface Project {
  id: string;
  name: string;
  clientId: string;
  budget: number;
  status: ProjectStatus;
  dueDate: string;
  progress: number;
}
export interface Activity {
  id: string;
  text: string;
  time: string;
}
