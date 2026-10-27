/** Provisiona las dos cuentas de demostración. No se ejecuta al arrancar la API. */
const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SECRET_KEY;
if(!base || !key || !process.env.ADMIN_PASSWORD || !process.env.USER_PASSWORD)throw Error('Faltan variables privadas de aprovisionamiento.');
const headers={apikey:key,'Content-Type':'application/json',...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})};
async function request(path,method='GET',body) {
  const res=await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  if(!res.ok)throw Error(`Aprovisionamiento HTTP ${res.status} en ${path.split('?')[0]}`);
  return res.status===204?null:res.json();
}
const users=[];
for(let page=1;;page++) {const result=await request(`/auth/v1/admin/users?page=${page}&per_page=100`);users.push(...result.users);if(result.users.length<100)break;}
for(const account of [
  {email:'admin@nexo.example',password:process.env.ADMIN_PASSWORD,role:'admin',full_name:'Administración Nexo',display_name:'Administración'},
  {email:'usuario@nexo.example',password:process.env.USER_PASSWORD,role:'user',full_name:'Equipo Nexo',display_name:'Equipo Nexo'}
]) {
  let user=users.find(u=>u.email===account.email);
  if(!user) {const result=await request('/auth/v1/admin/users','POST',{email:account.email,password:account.password,email_confirm:true});user=result.user||result;}
  // No rotar contraseñas ni sobrescribir preferencias si la cuenta ya existía.
  const profile=(await request(`/rest/v1/nexo_users?id=eq.${user.id}&select=id,full_name,display_name,role`))[0];
  if(!profile)throw Error('Falta el perfil; aplica primero la migración de usuarios.');
  const patch={role:account.role};
  if(profile.full_name==='Usuario Nexo')patch.full_name=account.full_name;
  if(profile.display_name==='Usuario Nexo')patch.display_name=account.display_name;
  const res=await fetch(base+`/rest/v1/nexo_users?id=eq.${user.id}`,{method:'PATCH',headers,body:JSON.stringify(patch)});
  if(!res.ok)throw Error(`No se pudo configurar el perfil: HTTP ${res.status}`);
  console.log(`Cuenta preparada: ${account.email} (${account.role})`);
}
