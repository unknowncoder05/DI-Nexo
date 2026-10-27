import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const migration = await readFile(new URL('../supabase/migrations/20261027000100_nexo.sql',import.meta.url),'utf8');
const seed = await readFile(new URL('./fixtures/seed.sql',import.meta.url),'utf8');
test('PostgreSQL: migración, restricciones, RLS y actividad transaccional', async () => {
  const db=new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(migration); await db.exec(seed);
    const count=async table => Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n);
    assert.equal(await count('nexo_clients'),4);assert.equal(await count('nexo_projects'),6);assert.equal(await count('nexo_activity'),10);
    await db.exec(seed);assert.equal(await count('nexo_activity'),10);
    await assert.rejects(db.query("insert into public.nexo_clients(name,email,sector) values ('Duplicate','hola@horizonte.example','Test')"),e=>e.code==='23505');
    await assert.rejects(db.query("insert into public.nexo_projects(name,client_id,budget,due_date) values ('Invalid','missing',10,'2026-12-01')"),e=>e.code==='23503');
    await assert.rejects(db.query("update public.nexo_projects set status='Completado',progress=20 where id='p1'"),e=>e.code==='23514');
    assert.equal(await count('nexo_activity'),10);
    await db.exec('set role service_role');
    await db.query("update public.nexo_projects set status='Completado',progress=100 where id='p1'");
    assert.equal(await count('nexo_activity'),11);
    const activity=await db.query("select payload from public.nexo_activity where payload->>'text' like '%Completado (100 %)%'");
    assert.equal(activity.rows.length,1);
    for(const role of ['anon','authenticated']) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(db.query('select * from public.nexo_clients'),e=>e.code==='42501');
      await assert.rejects(db.query("insert into public.nexo_activity(payload) values ('{\"text\":\"fake\"}')"),e=>e.code==='42501');
    }
    await db.exec('reset role');
    const rls=await db.query("select relrowsecurity from pg_class where relname in ('nexo_clients','nexo_projects','nexo_activity')");
    assert.equal(rls.rows.length,3);assert.ok(rls.rows.every(r=>r.relrowsecurity));
    await db.exec('begin');
    await db.query("insert into public.nexo_clients(name,email,sector) values ('Rollback','rollback@test.example','Test')");
    await db.exec('rollback');
    assert.equal(await count('nexo_activity'),11);
  } finally {await db.close();}
});
test('15 columnas y RLS: perfiles propios, privilegios y escritura de negocio', async () => {
  const db = new PGlite();
  const admin='11111111-1111-4111-8111-111111111111', user='22222222-2222-4222-8222-222222222222';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; grant usage on schema auth to authenticated;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    await db.exec(migration);await db.exec(seed);
    await db.exec(await readFile(new URL('../supabase/migrations/20261027000200_users_rls.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261027000300_unify_users_clients.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261027000400_client_fields.sql',import.meta.url),'utf8'));
    await db.query("insert into auth.users values ($1,'admin@nexo.example','{}'),($2,'usuario@nexo.example','{\"role\":\"admin\"}')",[admin,user]);
    await db.query("update public.nexo_users set role='admin' where id=$1",[admin]);
    const columns=await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='nexo_users'");assert.equal(columns.rows.length,15);
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
    const profiles=await db.query('select * from public.nexo_users');assert.equal(profiles.rows.length,1);assert.equal(profiles.rows[0].role,'user');
    await assert.rejects(db.query("update public.nexo_users set role='admin' where id=$1",[user]),e=>e.code==='42501');
    await assert.rejects(db.query("update public.nexo_users set email='other@test.example' where id=$1",[user]),e=>e.code==='42501');
    assert.equal((await db.query("update public.nexo_users set display_name='Intruder' where id=$1 returning id",[admin])).rows.length,0);
    await db.query("update public.nexo_users set full_name='Full Name',display_name='Visible',phone='+341234',job_title='Developer',sector='IT',locale='en-GB',timezone='UTC',theme='dark',notifications_enabled=false where id=$1",[user]);
    await db.query('select public.nexo_record_login()');
    const own=(await db.query('select * from public.nexo_users')).rows[0];assert.equal(own.theme,'dark');assert.ok(own.last_login_at);assert.ok(own.updated_at);
    await assert.rejects(db.query("insert into public.nexo_users(full_name,display_name,email,sector) values ('Forbidden','Forbidden','forbidden@test.example','Test')"),e=>e.code==='42501');
    assert.equal((await db.query("update public.nexo_projects set progress=30 where id='p1' returning id")).rows.length,0);
    await assert.rejects(db.query("insert into public.nexo_activity(payload) values ('{\"text\":\"fake\"}')"),e=>e.code==='42501');
    assert.equal((await db.query('select * from public.nexo_projects')).rows.length,0);
    assert.equal((await db.query('select * from public.nexo_activity')).rows.length,0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
    assert.equal((await db.query('select * from public.nexo_users')).rows.length,6);
    await assert.rejects(db.query("insert into public.nexo_users(full_name,display_name,email,role) values ('Admin','Admin','fakeadmin@test.example','admin')"),e=>e.code==='42501');
    await db.query("insert into public.nexo_users(full_name,display_name,email,sector,phone,job_title,locale,timezone,theme,notifications_enabled) values ('Allowed','Allowed','allowed@test.example','Test','+341234','Developer','en-GB','UTC','dark',false)");
    const created=(await db.query("select * from public.nexo_users where email='allowed@test.example'")).rows[0];
    assert.equal(created.phone,'+341234');assert.equal(created.theme,'dark');assert.equal(created.notifications_enabled,false);assert.equal(created.role,'user');
    await db.query("update public.nexo_projects set progress=30 where id='p1'");
    assert.equal((await db.query('select * from public.nexo_activity')).rows.length,14);
    await db.exec('reset role');
    assert.equal((await db.query("select to_regclass('public.nexo_clients') as t")).rows[0].t,null);
    // Linking an existing customer to Auth keeps one row and moves its projects.
    await db.query("insert into auth.users values ('33333333-3333-4333-8333-333333333333','hola@horizonte.example','{}')");
    assert.equal((await db.query("select * from public.nexo_users where email='hola@horizonte.example'")).rows.length,1);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false)");
    assert.equal((await db.query('select * from public.nexo_projects')).rows.length,2);
    await assert.rejects(db.query("update public.nexo_users set id='spoofed'"),e=>e.code==='42501');
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.nexo_users'),e=>e.code==='42501');
  } finally {await db.close();}
});
