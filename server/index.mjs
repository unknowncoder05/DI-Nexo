import express from "express";
import { resolve } from "node:path";
import { createApp } from "./app.mjs";
const app = createApp();
const root = resolve(process.env.STATIC_ROOT || "dist/nexo/browser");
app.use(express.static(root));
app.get("/{*path}", (_req, res) => res.sendFile(resolve(root, "index.html")));
const port = Number(process.env.PORT ?? 4310);
app.listen(port, process.env.HOST || "0.0.0.0", (error) => {
  if (error) { console.error(error.message); process.exitCode = 1; return; }
  console.log(`Nexo API / preview: http://localhost:${port}`);
});
