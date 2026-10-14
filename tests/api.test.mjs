import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { createApp } from "../server/app.mjs";
const config = {
  JWT_SECRET: randomBytes(48).toString("hex"),
  ADMIN_PASSWORD: randomBytes(16).toString("hex"),
  USER_PASSWORD: randomBytes(16).toString("hex"),
};
let app;
beforeEach(() => {
  app = createApp(config);
});
const login = async (role = "admin") => {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .set("X-Nexo-Request", "1")
    .send({
      email: role === "admin" ? "admin@nexo.example" : "usuario@nexo.example",
      password: role === "admin" ? config.ADMIN_PASSWORD : config.USER_PASSWORD,
    })
    .expect(200);
  return agent;
};
test("rechaza acceso sin sesión y cookies manipuladas", async () => {
  await request(app).get("/api/sql/projects").expect(401);
  await request(app)
    .get("/api/admin/summary")
    .set("Cookie", "nexo_session=invalid")
    .expect(401);
});
test("la sesión usa cookie HttpOnly y devuelve solo el usuario público", async () => {
  const result = await request(app)
    .post("/api/auth/login")
    .set("X-Nexo-Request", "1")
    .send({ email: "admin@nexo.example", password: config.ADMIN_PASSWORD })
    .expect(200);
  assert.match(result.headers["set-cookie"][0], /HttpOnly/);
  assert.match(result.headers["set-cookie"][0], /SameSite=Strict/);
  assert.equal(result.body.role, "admin");
  assert.equal(result.body.hash, undefined);
  assert.equal(result.body.password, undefined);
});
test("usuario estándar puede consultar pero no gestionar ni ver métricas de administrador", async () => {
  const agent = await login("user");
  await agent.get("/api/sql/projects").expect(200);
  await agent.get("/api/admin/summary").expect(403);
  await agent
    .post("/api/sql/clients")
    .set("X-Nexo-Request", "1")
    .send({})
    .expect(403);
  await agent
    .post("/api/sql/projects")
    .set("X-Nexo-Request", "1")
    .send({})
    .expect(403);
  await agent
    .patch("/api/sql/projects/p1")
    .set("X-Nexo-Request", "1")
    .send({ status: "Completado", progress: 100 })
    .expect(403);
});
test("validación de correo y alta sin duplicados", async () => {
  const agent = await login();
  const email = "nuevo@cliente.example";
  assert.equal(
    (await agent.get("/api/sql/email-available").query({ email })).body
      .available,
    true,
  );
  await agent
    .post("/api/sql/clients")
    .set("X-Nexo-Request", "1")
    .send({ name: "Cliente de prueba", email, sector: "Diseño" })
    .expect(201);
  assert.equal(
    (await agent.get("/api/sql/email-available").query({ email })).body
      .available,
    false,
  );
  await agent
    .post("/api/sql/clients")
    .set("X-Nexo-Request", "1")
    .send({ name: "Duplicado", email: email.toUpperCase(), sector: "Diseño" })
    .expect(409);
});
test("crea proyecto, verifica referencia de cliente y actualiza actividad documental", async () => {
  const agent = await login();
  const project = {
    name: "Proyecto sintético",
    clientId: "c1",
    budget: 123.45,
    dueDate: "2026-12-20",
  };
  await agent
    .post("/api/sql/projects")
    .set("X-Nexo-Request", "1")
    .send({ ...project, clientId: "missing" })
    .expect(400);
  await agent
    .post("/api/sql/projects")
    .set("X-Nexo-Request", "1")
    .send({ ...project, dueDate: "2026-02-31" })
    .expect(400);
  const result = await agent
    .post("/api/sql/projects")
    .set("X-Nexo-Request", "1")
    .send(project)
    .expect(201);
  await agent
    .patch(`/api/sql/projects/${result.body.id}`)
    .set("X-Nexo-Request", "1")
    .send({ status: "Completado", progress: 20 })
    .expect(400);
  await agent
    .patch(`/api/sql/projects/${result.body.id}`)
    .set("X-Nexo-Request", "1")
    .send({ status: "Completado", progress: 100 })
    .expect(200);
  const activity = await agent.get("/api/nosql/activity").expect(200);
  assert.match(activity.body[0].text, /Completado/);
});
test("rechaza mutaciones de otro origen y errores de credenciales", async () => {
  await request(app).post("/api/auth/login").send({}).expect(403);
  await request(app)
    .post("/api/auth/login")
    .set("X-Nexo-Request", "1")
    .set("Sec-Fetch-Site", "cross-site")
    .send({})
    .expect(403);
  await request(app)
    .post("/api/auth/login")
    .set("X-Nexo-Request", "1")
    .send({
      email: "admin@nexo.example",
      password: randomBytes(16).toString("hex"),
    })
    .expect(401);
});
test("cerrar sesión elimina el acceso a datos protegidos", async () => {
  const agent = await login();
  await agent.get("/api/auth/me").expect(200);
  await agent
    .post("/api/auth/logout")
    .set("X-Nexo-Request", "1")
    .send({})
    .expect(204);
  await agent.get("/api/sql/projects").expect(401);
});
