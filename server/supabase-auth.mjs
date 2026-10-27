import { DatabaseError } from './supabase-repository.mjs';
/** Supabase verifica credenciales y tokens. No se utiliza la clave de servicio. */
export function createSupabaseAuth(config=process.env, fetcher=fetch) {
  if(!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) throw Error('Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY.');
  async function request(path, method='GET', body, token) {
    let response;
    try {
      response=await fetcher(new URL('/auth/v1/'+path,config.SUPABASE_URL),{
        method,headers:{apikey:config.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)
      });
    } catch {throw new DatabaseError(503,'No se pudo contactar con el servicio de acceso.');}
    if(!response.ok) {
      if([400,401,403,422].includes(response.status))throw new DatabaseError(401,'Correo, contraseña o sesión incorrectos.');
      if(response.status===429)throw new DatabaseError(429,'Demasiados intentos. Espera antes de volver a acceder.');
      throw new DatabaseError(503,'El servicio de acceso no está disponible.');
    }
    return response.status===204?null:response.json();
  }
  return {
    login:(email,password)=>request('token?grant_type=password','POST',{email,password}),
    async authenticate(token) {if(!token)throw new DatabaseError(401,'Inicia sesión para continuar.');return request('user','GET',undefined,token);},
    async logout(token) {if(token) {try {await request('logout?scope=local','POST',undefined,token);}catch(e){if(e.status!==401)throw e;}}},
  };
}
