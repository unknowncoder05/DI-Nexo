import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createSupabaseAuth } from "./supabase-auth.mjs";
import { randomUUID } from "node:crypto";
import { createSupabaseRepository, DatabaseError } from "./supabase-repository.mjs";

const statuses = ["Pendiente", "En curso", "Completado"];
const validEmail = (value) =>
  typeof value === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
  value.length <= 254;
const validText = (value, max = 120) =>
  typeof value === "string" && value.trim().length >= 2 && value.length <= max;
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

/** API con autorización por roles y persistencia en Supabase. */
export function createApp(config = process.env, dependencies = {}) {
  const auth = dependencies.auth || createSupabaseAuth(config);
  const repositoryFor = dependencies.repositoryFor || (token => createSupabaseRepository(config, fetch, token));
  const app = express();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: config.NODE_ENV === "production",
    path: config.COOKIE_PATH || "/",
    maxAge: 60 * 60 * 1000,
  };
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:"],
          "connect-src": ["'self'"],
          "upgrade-insecure-requests":
            config.NODE_ENV === "production" ? [] : null,
        },
      },
    }),
  );
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  // Los métodos mutadores solo aceptan JSON y llamadas same-origin desde el cliente.
  app.use("/api", (req, res, next) => {
    if (
      ["POST", "PATCH", "DELETE"].includes(req.method) &&
      (req.get("X-Nexo-Request") !== "1" ||
        (req.get("Sec-Fetch-Site") &&
          !["same-origin", "none"].includes(req.get("Sec-Fetch-Site"))))
    )
      return res
        .status(403)
        .json({ message: "Origen de solicitud no permitido." });
    next();
  });
  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        message: "Demasiados intentos. Vuelve a intentarlo más tarde.",
      },
    }),
    async (req, res) => {
      const { email, password } = req.body ?? {};
      if (
        !validEmail(email) ||
        typeof password !== "string" ||
        password.length > 256
      )
        return res
          .status(400)
          .json({ message: "Introduce un correo y una contraseña válidos." });
      const session = await auth.login(email.toLowerCase().trim(), password);
      const repository = repositoryFor(session.access_token);
      await repository.recordLogin();
      const user = await repository.profile(session.user.id);
      res.cookie('nexo_session', session.access_token, { ...cookieOptions, maxAge: Math.min(session.expires_in || 3600, 3600) * 1000 }).json(user);
    },
  );
  app.post('/api/auth/logout', async (req, res) => {
    await auth.logout(req.cookies.nexo_session);
    res.clearCookie('nexo_session', { ...cookieOptions, maxAge: undefined }).status(204).end();
  });
  app.use('/api', async (req, res, next) => {
    try {
      const token = req.cookies.nexo_session;
      const identity = await auth.authenticate(token);
      req.repository = repositoryFor(token);
      req.user = await req.repository.profile(identity.id);
      next();
    } catch (error) {
      if(error.status === 401 && req.path === '/auth/me') return res.json(null);
      next(error);
    }
  });
  const admin = (req, res, next) =>
    req.user.role === "admin"
      ? next()
      : res
          .status(403)
          .json({ message: "Esta acción requiere el rol Administrador." });
  app.get("/api/auth/me", (req, res) => res.json(req.user));
  app.patch('/api/profile', async (req, res) => {
    const fields = ['full_name','display_name','phone','job_title','sector','locale','timezone','theme','notifications_enabled'];
    const body = req.body;
    if(!body || Array.isArray(body) || Object.keys(body).some(k => !fields.includes(k))) return res.status(400).json({message:'Campos de perfil no permitidos.'});
    const limits = {full_name:120,display_name:60,phone:30,job_title:80,sector:60};
    for(const [key,max] of Object.entries(limits)) if(key in body && (typeof body[key] !== 'string' || body[key].length > max || (['full_name','display_name'].includes(key) && body[key].trim().length < 2))) return res.status(400).json({message:'Revisa los campos del perfil.'});
    const choices={locale:['es-ES','en-GB'],timezone:['Europe/Madrid','UTC','America/Bogota'],theme:['light','dark','system']};
    for(const [key,values] of Object.entries(choices)) if(key in body && !values.includes(body[key])) return res.status(400).json({message:'Preferencia no válida.'});
    if('notifications_enabled' in body && typeof body.notifications_enabled !== 'boolean') return res.status(400).json({message:'Preferencia de avisos no válida.'});
    res.json(await req.repository.updateProfile(req.user.id,body));
  });
  // Contrato REST relacional: proyectos referencian clientes por clave foránea.
  app.get("/api/sql/clients", async (req, res) => res.json(await req.repository.clients()));
  app.get("/api/sql/projects", async (req, res) => res.json(await req.repository.projects()));
  app.get("/api/sql/email-available", async (req, res) => {
    const email = String(req.query.email ?? "")
      .trim()
      .toLowerCase();
    if (!validEmail(email))
      return res.status(400).json({ message: "Correo no válido." });
    res.json({ available: await req.repository.emailAvailable(email) });
  });
  app.post("/api/sql/clients", admin, async (req, res) => {
    const { name, email, sector } = req.body ?? {};
    if (!validText(name) || !validEmail(email) || !validText(sector, 60))
      return res.status(400).json({ message: "Revisa los datos del cliente." });
    const normalized = email.trim().toLowerCase();
    const client = {
      id: randomUUID(),
      name: name.trim(),
      email: normalized,
      sector: sector.trim(),
    };
    res.status(201).json(await req.repository.addClient(client));
  });
  app.post("/api/sql/projects", admin, async (req, res) => {
    const { name, clientId, budget, dueDate } = req.body ?? {};
    if (
      !validText(name) ||
      typeof clientId !== "string" || !clientId || clientId.length > 80 ||
      !Number.isFinite(budget) ||
      budget < 0 ||
      budget > 10000000 ||
      !validDate(dueDate)
    )
      return res
        .status(400)
        .json({ message: "Revisa el nombre, cliente, presupuesto y fecha." });
    const project = {
      id: randomUUID(),
      name: name.trim(),
      clientId,
      budget: Math.round(budget * 100) / 100,
      dueDate,
      status: "Pendiente",
      progress: 0,
    };
    res.status(201).json(await req.repository.addProject(project));
  });
  app.patch("/api/sql/projects/:id", admin, async (req, res) => {
    const { status, progress } = req.body ?? {};
    if (
      !statuses.includes(status) ||
      !Number.isInteger(progress) ||
      progress < 0 ||
      progress > 100 ||
      (status === "Completado" && progress !== 100) ||
      (status === "Pendiente" && progress !== 0)
    )
      return res
        .status(400)
        .json({ message: "El estado y el progreso no son coherentes." });
    res.json(await req.repository.updateProject(req.params.id, { status, progress }));
  });
  // Documentos JSONB persistidos en PostgreSQL; el cliente consulta cada 5 s.
  app.get("/api/nosql/activity", async (req, res) => res.json(await req.repository.activity()));
  app.get("/api/admin/summary", admin, async (req, res) => {
    const [clients, projects] = await Promise.all([req.repository.clients(), req.repository.projects()]);
    res.json({ clients: clients.length, projects: projects.length, budget: projects.reduce((sum, p) => sum + p.budget, 0) });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "Recurso no encontrado." }),
  );
  app.use((error, _req, res, _next) => {
    const status = error instanceof DatabaseError ? error.status : error.status === 400 ? 400 : 500;
    res.status(status).json({ message: error instanceof DatabaseError ? error.message : status === 400 ? "Solicitud no válida." : "No se ha podido procesar la solicitud." });
  });
  return app;
}
