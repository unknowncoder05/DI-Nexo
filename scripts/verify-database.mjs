/** Verificación directa de Supabase y RLS con las dos cuentas configuradas. */
import assert from 'node:assert/strict';
import { createSupabaseAuth } from '../server/supabase-auth.mjs';
import { createSupabaseRepository } from '../server/supabase-repository.mjs';
const auth=createSupabaseAuth(), sessions=[];
async function rest(path,token,method='GET',body) {
 return fetch(new URL('/rest/v1/'+path,process.env.SUPABASE_URL),{method,headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
}
try {
 const admin=await auth.login('admin@nexo.example',process.env.ADMIN_PASSWORD);sessions.push(admin);
 const user=await auth.login('usuario@nexo.example',process.env.USER_PASSWORD);sessions.push(user);
 const adminRepo=createSupabaseRepository(process.env,fetch,admin.access_token);
 const userRepo=createSupabaseRepository(process.env,fetch,user.access_token);
 const rows=await (await rest('nexo_users?select=*',admin.access_token)).json();
 assert.ok(rows.length>=2);assert.equal(Object.keys(rows[0]).length,15);
 const own=await (await rest('nexo_users?select=*',user.access_token)).json();
 assert.equal(own.length,1);assert.equal(own[0].id,user.user.id);assert.equal(own[0].role,'user');
 assert.equal((await rest('nexo_users?select=id')).status,401);
 assert.equal((await rest('nexo_clients?select=id',admin.access_token)).status,404);
 for(const change of [{role:'admin'},{email:'other@example.com'},{id:admin.user.id},{created_at:new Date().toISOString()}]) {
  assert.equal((await rest(`nexo_users?id=eq.${user.user.id}`,user.access_token,'PATCH',change)).status,403);
 }
 assert.deepEqual(await (await rest(`nexo_users?id=eq.${admin.user.id}`,user.access_token,'PATCH',{display_name:'Forbidden'})).json(),[]);
 assert.equal((await rest('nexo_users',user.access_token,'POST',{full_name:'Forbidden',display_name:'Forbidden',email:'forbidden@example.com',sector:'Test'})).status,403);
 const projects=await userRepo.projects();assert.ok(projects.every(p=>p.clientId===user.user.id));
 assert.deepEqual(await userRepo.activity(),[]);
 const allProjects=await adminRepo.projects();assert.ok(allProjects.length>=6);
 assert.deepEqual(await (await rest(`nexo_projects?id=eq.${allProjects[0].id}`,user.access_token,'PATCH',{progress:allProjects[0].progress})).json(),[]);
 assert.equal((await rest('nexo_activity',user.access_token,'POST',{payload:{text:'Forbidden'}})).status,403);
 // A real own-profile write, then restore the user's value even if verification fails.
 try {
  await userRepo.updateProfile(user.user.id,{phone:'+34 600 000 001'});
  const fresh=createSupabaseRepository(process.env,fetch,user.access_token);
  assert.equal((await fresh.profile(user.user.id)).phone,'+34 600 000 001');
 } finally {await userRepo.updateProfile(user.user.id,{phone:own[0].phone});}
 console.log(`Supabase verificado: ${rows.length} usuarios/clientes, 15 columnas, ${allProjects.length} proyectos. RLS y persistencia correctos.`);
} finally {for(const session of sessions)await auth.logout(session.access_token);}
