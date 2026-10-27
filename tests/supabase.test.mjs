import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseRepository } from '../server/supabase-repository.mjs';
const config = { SUPABASE_URL:'https://project.example', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only' };
const makeRepository = (config, fetcher) => createSupabaseRepository(config, fetcher, 'user-jwt-test');
const json = (value, status=200) => new Response(JSON.stringify(value), {status});
test('consulta mediante REST con JWT de usuario y convierte los campos de proyectos', async () => {
  const calls=[];
  const repo=makeRepository(config, async (url, options) => {calls.push({url,options});return json([{id:'p1',clientId:'c1',dueDate:'2026-12-01'}]);});
  await repo.addProject({id:'p1',name:'Proyecto',clientId:'c1',dueDate:'2026-12-01',budget:5,status:'Pendiente',progress:0});
  assert.equal(calls[0].url.pathname, '/rest/v1/nexo_projects');
  assert.equal(calls[0].options.headers.apikey, config.SUPABASE_PUBLISHABLE_KEY);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer user-jwt-test');
  assert.equal(JSON.parse(calls[0].options.body).client_id,'c1');
  assert.equal(JSON.parse(calls[0].options.body).due_date,'2026-12-01');
  assert.match(calls[0].url.searchParams.get('select'), /clientId:client_id/);
});
test('pagina todos los registros para no truncar los informes', async () => {
  const offsets=[];
  const repo=makeRepository(config, async url => { offsets.push(url.searchParams.get('offset'));return json(offsets.length===1 ? Array.from({length:500},(_,i)=>({id:String(i)})) : [{id:'last'}]); });
  assert.equal((await repo.clients()).length,501);assert.deepEqual(offsets,['0','500']);
});
test('el correo se codifica como valor y no puede añadir filtros REST', async () => {
  const email='x+test&limit=999@example.test';
  const repo=makeRepository(config, async url => {assert.equal(url.searchParams.get('email'),`eq.${email}`);assert.equal(url.searchParams.get('limit'),'1');return json([]);});
  assert.equal(await repo.emailAvailable(email),true);
});
test('traduce restricciones de PostgreSQL y fallos de red sin revelar secretos', async () => {
  for(const [code,status] of [['23505',409],['23503',400],['23514',400],['42501',403]]) {
    const repo=makeRepository(config, async()=>json({code,message:'private database detail'},400));
    await assert.rejects(repo.addClient({name:'Test',email:'test@example.com',sector:'Test'}), e=>e.status===status && !e.message.includes('private'));
  }
  const repo=makeRepository(config, async()=>{throw new Error('private URL');});
  await assert.rejects(repo.clients(),e=>e.status===503 && !e.message.includes('private'));
});
test('actualización inexistente devuelve 404 y actividad convierte los documentos JSONB',async()=>{
  const missing=makeRepository(config,async()=>json([]));
  await assert.rejects(missing.updateProject('missing',{status:'Completado',progress:100}),e=>e.status===404);
  const repo=makeRepository(config,async()=>json([{id:'e1',payload:{text:'Proyecto creado'},created_at:'2026-10-27T12:00:00Z'}]));
  assert.deepEqual(await repo.activity(),[{id:'e1',text:'Proyecto creado',time:'2026-10-27T12:00:00Z'}]);
});
