// Doble de pruebas explícito. Nunca se importa desde el servidor de producción.
import { randomUUID } from 'node:crypto';
import { seedClients, seedProjects } from './seed.mjs';
import { DatabaseError } from '../../server/supabase-repository.mjs';
export function testRepository() {
  const clients = structuredClone(seedClients), projects = structuredClone(seedProjects), events = [];
  const record = text => events.unshift({id: randomUUID(), text, time: new Date().toISOString()});
  return {
    clients: async () => structuredClone(clients),
    projects: async () => structuredClone(projects),
    emailAvailable: async email => !clients.some(c => c.email === email),
    async addClient(client) {
      if (clients.some(c => c.email === client.email)) throw new DatabaseError(409, 'Correo duplicado.');
      clients.unshift(client); record(`Alta de cliente: ${client.name}`); return client;
    },
    async addProject(project) {
      if (!clients.some(c => c.id === project.clientId)) throw new DatabaseError(400, 'Cliente no válido.');
      projects.unshift(project); record(`Nuevo proyecto: ${project.name}`); return project;
    },
    async updateProject(id, changes) {
      const project = projects.find(p => p.id === id);
      if (!project) throw new DatabaseError(404, 'Proyecto no encontrado.');
      Object.assign(project, changes); record(`${project.name}: ${project.status}`); return project;
    },
    activity: async () => structuredClone(events),
  };
}
export function testDependencies(config, repository = testRepository()) {
  const now = new Date().toISOString();
  const profiles = [
    {id:'admin',email:'admin@nexo.example',name:'Administración',display_name:'Administración',full_name:'Administración Nexo',role:'admin'},
    {id:'user',email:'usuario@nexo.example',name:'Equipo Nexo',display_name:'Equipo Nexo',full_name:'Equipo Nexo',role:'user'}
  ].map(p=>({...p,phone:'',job_title:'',sector:'',locale:'es-ES',timezone:'Europe/Madrid',theme:'light',notifications_enabled:true,created_at:now,updated_at:now,last_login_at:null}));
  const tokens = new Map();
  repository.profile = async id => structuredClone(profiles.find(p=>p.id===id));
  repository.recordLogin = async () => {};
  repository.updateProfile = async (id,changes) => {const p=profiles.find(p=>p.id===id);Object.assign(p,changes,{updated_at:new Date().toISOString()});p.name=p.display_name;return structuredClone(p);};
  return {
    repositoryFor:()=>repository,
    auth: {
      async login(email,password) {
        const user=profiles.find(p=>p.email===email);
        if(!user || password!==config[user.role==='admin'?'ADMIN_PASSWORD':'USER_PASSWORD'])throw new DatabaseError(401,'Correo o contraseña incorrectos.');
        const token=randomUUID();tokens.set(token,user);user.last_login_at=new Date().toISOString();return {access_token:token,user,expires_in:3600};
      },
      async authenticate(token) {const user=tokens.get(token);if(!user)throw new DatabaseError(401,'Sesión no válida.');return user;},
      async logout(token) {tokens.delete(token);}
    }
  };
}
