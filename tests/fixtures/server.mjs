import express from 'express';
import { resolve } from 'node:path';
import { createApp } from '../../server/app.mjs';
import { testDependencies } from './repository.mjs';
const app = createApp(process.env, testDependencies(process.env));
const root = resolve('dist/nexo/browser');
app.use(express.static(root));
app.get('/{*path}', (_req, res) => res.sendFile(resolve(root, 'index.html')));
app.listen(4310, '127.0.0.1');
