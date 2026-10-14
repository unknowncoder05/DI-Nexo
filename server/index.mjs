import express from 'express';
import { resolve } from 'node:path';
import { createApp } from './app.mjs';
const app = createApp();
const root = resolve('dist/nexo/browser');
app.use(express.static(root));
app.get('/{*path}', (_req, res) => res.sendFile(resolve(root, 'index.html')));
const port = Number(process.env.PORT ?? 3000);
app.listen(port, '0.0.0.0', () => console.log(`Nexo API / preview: http://localhost:${port}`));
