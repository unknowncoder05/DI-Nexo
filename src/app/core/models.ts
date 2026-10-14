/** Contratos compartidos por las vistas y los servicios de datos. */
export interface User { id: string; name: string; email: string; role: 'admin' | 'user'; }
export interface Client { id: string; name: string; email: string; sector: string; }
export type ProjectStatus = 'Pendiente' | 'En curso' | 'Completado';
export interface Project { id: string; name: string; clientId: string; budget: number; status: ProjectStatus; dueDate: string; progress: number; }
export interface Activity { id: string; text: string; time: string; }
