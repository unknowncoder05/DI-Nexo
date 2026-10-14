/** Datos exclusivamente sintéticos. Adaptadores SQL/NoSQL simulados. */
export const seedClients = [
  { id: 'c1', name: 'Estudio Horizonte', email: 'hola@horizonte.example', sector: 'Diseño' },
  { id: 'c2', name: 'Órbita Digital', email: 'equipo@orbita.example', sector: 'Tecnología' },
  { id: 'c3', name: 'Raíz Cooperativa', email: 'hola@raiz.example', sector: 'Comercio' },
  { id: 'c4', name: 'Atlas Consultoría', email: 'equipo@atlas.example', sector: 'Servicios' }
];
export const seedProjects = [
  { id: 'p1', name: 'Nueva identidad de marca', clientId: 'c1', budget: 8400, status: 'En curso', dueDate: '2026-11-20', progress: 65 },
  { id: 'p2', name: 'Portal de clientes', clientId: 'c2', budget: 18500, status: 'En curso', dueDate: '2026-12-10', progress: 40 },
  { id: 'p3', name: 'Tienda online sostenible', clientId: 'c3', budget: 12500, status: 'Pendiente', dueDate: '2026-12-22', progress: 0 },
  { id: 'p4', name: 'Auditoría de experiencia', clientId: 'c4', budget: 6200, status: 'Completado', dueDate: '2026-10-08', progress: 100 },
  { id: 'p5', name: 'Sistema de diseño', clientId: 'c2', budget: 9600, status: 'En curso', dueDate: '2026-11-30', progress: 75 },
  { id: 'p6', name: 'Campaña de lanzamiento', clientId: 'c1', budget: 4800, status: 'Pendiente', dueDate: '2026-12-15', progress: 0 }
];
