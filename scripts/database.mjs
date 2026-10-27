/** Comandos reproducibles: npm run db:setup (migraciones), npm run db:plan (vista previa). */
import { spawn } from 'node:child_process';
if (!process.env.SUPABASE_PROJECT_REF || !process.env.SUPABASE_ACCESS_TOKEN || !process.env.SUPABASE_DB_PASSWORD) {
  throw Error('Configura SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN y SUPABASE_DB_PASSWORD en .env.');
}
const dryRun = process.argv.includes('--dry-run');
for (const args of [
  ['link', '--project-ref', process.env.SUPABASE_PROJECT_REF],
  ['db', 'push', '--linked', ...(dryRun ? ['--dry-run'] : ['--yes'])],
]) {
  const child = spawn('npx', ['--yes', 'supabase@2.122.0', ...args], { stdio: 'inherit', env: process.env });
  child.on('error', () => { console.error('No se pudo ejecutar Supabase CLI.'); process.exit(1); });
  const code = await new Promise(resolve => child.on('exit', resolve));
  if (code !== 0) process.exit(code || 1);
}
