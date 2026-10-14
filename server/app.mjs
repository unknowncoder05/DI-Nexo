import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { seedClients, seedProjects } from './seed.mjs';

const statuses = ['Pendiente', 'En curso', 'Completado'];
const validEmail = value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const validText = (value, max = 120) => typeof value === 'string' && value.trim().length >= 2 && value.length <= max;
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

/** API de demostración con autorización real y repositorios simulados en memoria. */
export function createApp(config = process.env) {
  if (!config.JWT_SECRET || config.JWT_SECRET.length < 32 || !config.ADMIN_PASSWORD || !config.USER_PASSWORD) {
    throw new Error('Falta configuración: ejecuta npm run setup o define JWT_SECRET, ADMIN_PASSWORD y USER_PASSWORD.');
  }
  const app = express();
  const key = new TextEncoder().encode(config.JWT_SECRET);
  const users = [
    { id: 'admin', name: 'Administración', email: 'admin@nexo.example', role: 'admin', password: config.ADMIN_PASSWORD },
    { id: 'user', name: 'Equipo Nexo', email: 'usuario@nexo.example', role: 'user', password: config.USER_PASSWORD }
  ].map(({ password, ...user }) => ({ ...user, hash: scryptSync(password, user.id, 64) }));
  const publicUser = ({ hash, ...user }) => user;
  const clients = structuredClone(seedClients);
  const projects = structuredClone(seedProjects);
  const events = [{ id: randomUUID(), text: 'Espacio de trabajo de demostración preparado', time: new Date().toISOString() }];
  const record = text => { events.unshift({ id: randomUUID(), text, time: new Date().toISOString() }); events.splice(50); };
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: config.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 1000 };
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:'], 'connect-src': ["'self'"], 'upgrade-insecure-requests': config.NODE_ENV === 'production' ? [] : null } } }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  // Los métodos mutadores solo aceptan JSON y llamadas same-origin desde el cliente.
  app.use('/api', (req, res, next) => {
    if (['POST', 'PATCH', 'DELETE'].includes(req.method) && (req.get('X-Nexo-Request') !== '1' || (req.get('Sec-Fetch-Site') && !['same-origin', 'none'].includes(req.get('Sec-Fetch-Site'))))) return res.status(403).json({ message: 'Origen de solicitud no permitido.' });
    next();
  });
  app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Demasiados intentos. Vuelve a intentarlo más tarde.' } }), async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!validEmail(email) || typeof password !== 'string' || password.length > 256) return res.status(400).json({ message: 'Introduce un correo y una contraseña válidos.' });
    const user = users.find(u => u.email === email.toLowerCase().trim());
    const actual = scryptSync(password, user?.id ?? 'unknown', 64);
    if (!user || !timingSafeEqual(actual, user.hash)) return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    const token = await new SignJWT({ role: user.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuer('nexo').setAudience('nexo-app').setIssuedAt().setExpirationTime('1h').sign(key);
    res.cookie('nexo_session', token, cookieOptions).json(publicUser(user));
  });
  app.post('/api/auth/logout', (_req, res) => res.clearCookie('nexo_session', { ...cookieOptions, maxAge: undefined }).status(204).end());
  app.use('/api', async (req, res, next) => {
    try {
      const { payload } = await jwtVerify(req.cookies.nexo_session ?? '', key, { algorithms: ['HS256'], issuer: 'nexo', audience: 'nexo-app' });
      req.user = users.find(u => u.id === payload.sub && u.role === payload.role);
      if (!req.user) throw new Error('Sesión no válida');
      next();
    } catch { res.status(401).json({ message: 'La sesión ha caducado. Vuelve a iniciar sesión.' }); }
  });
  const admin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Esta acción requiere el rol Administrador.' });
  app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));
  // Contrato REST relacional: proyectos referencian clientes por clave foránea.
  app.get('/api/sql/clients', (_req, res) => res.json(clients));
  app.get('/api/sql/projects', (_req, res) => res.json(projects));
  app.get('/api/sql/email-available', (req, res) => {
    const email = String(req.query.email ?? '').trim().toLowerCase();
    if (!validEmail(email)) return res.status(400).json({ message: 'Correo no válido.' });
    res.json({ available: !clients.some(c => c.email === email) });
  });
  app.post('/api/sql/clients', admin, (req, res) => {
    const { name, email, sector } = req.body ?? {};
    if (!validText(name) || !validEmail(email) || !validText(sector, 60)) return res.status(400).json({ message: 'Revisa los datos del cliente.' });
    const normalized = email.trim().toLowerCase();
    if (clients.some(c => c.email === normalized)) return res.status(409).json({ message: 'Ya existe un cliente con ese correo.' });
    const client = { id: randomUUID(), name: name.trim(), email: normalized, sector: sector.trim() };
    clients.unshift(client); record(`Alta de cliente: ${client.name}`); res.status(201).json(client);
  });
  app.post('/api/sql/projects', admin, (req, res) => {
    const { name, clientId, budget, dueDate } = req.body ?? {};
    if (!validText(name) || !clients.some(c => c.id === clientId) || !Number.isFinite(budget) || budget < 0 || budget > 10000000 || !validDate(dueDate)) return res.status(400).json({ message: 'Revisa el nombre, cliente, presupuesto y fecha.' });
    const project = { id: randomUUID(), name: name.trim(), clientId, budget: Math.round(budget * 100) / 100, dueDate, status: 'Pendiente', progress: 0 };
    projects.unshift(project); record(`Nuevo proyecto: ${project.name}`); res.status(201).json(project);
  });
  app.patch('/api/sql/projects/:id', admin, (req, res) => {
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado.' });
    const { status, progress } = req.body ?? {};
    if (!statuses.includes(status) || !Number.isInteger(progress) || progress < 0 || progress > 100 || (status === 'Completado' && progress !== 100) || (status === 'Pendiente' && progress !== 0)) return res.status(400).json({ message: 'El estado y el progreso no son coherentes.' });
    Object.assign(project, { status, progress }); record(`${project.name}: ${status} (${progress} %)`); res.json(project);
  });
  // Colección documental; el cliente observa snapshots cada 5 s, sin inventar eventos.
  app.get('/api/nosql/activity', (_req, res) => res.json(events));
  app.get('/api/admin/summary', admin, (_req, res) => res.json({ clients: clients.length, projects: projects.length, budget: projects.reduce((sum, p) => sum + p.budget, 0) }));
  app.use('/api', (_req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));
  app.use((error, _req, res, _next) => res.status(error.status === 400 ? 400 : 500).json({ message: error.status === 400 ? 'Solicitud no válida.' : 'No se ha podido procesar la solicitud.' }));
  return app;
}
