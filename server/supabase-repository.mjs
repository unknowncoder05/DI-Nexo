/** Acceso a Supabase con JWT de usuario: todas las operaciones normales se someten a RLS. */
export class DatabaseError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function createSupabaseRepository(config = process.env, fetcher = fetch, accessToken) {
  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY antes de iniciar la API.');
  }
  const base = new URL(config.SUPABASE_URL);
  if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) {
    throw new Error('SUPABASE_URL debe utilizar HTTPS.');
  }
  if (!accessToken) throw new DatabaseError(401, 'Inicia sesión para continuar.');
  const headers = { apikey: config.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  async function request(table, query = {}, options = {}) {
    const url = new URL(`/rest/v1/${table}`, base);
    url.search = new URLSearchParams(query).toString();
    let response;
    try {
      response = await fetcher(url, { ...options, headers, signal: AbortSignal.timeout(10000) });
    } catch { throw new DatabaseError(503, 'No se pudo conectar con la base de datos. Inténtalo de nuevo.'); }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) throw new DatabaseError(401, 'La sesión ha caducado.');
      if (response.status === 403 || error.code === '42501') throw new DatabaseError(403, 'No tienes permisos para realizar esta acción.');
      if (error.code === '23505') throw new DatabaseError(409, 'Ya existe un registro con esos datos.');
      if (['23503', '23514', '23502', '22P02', '22007', '22008'].includes(error.code)) {
        throw new DatabaseError(400, 'Revisa los datos y el cliente seleccionado.');
      }
      throw new DatabaseError(503, 'La base de datos no está disponible. Inténtalo de nuevo.');
    }
    return response.status === 204 ? null : response.json();
  }
  async function list(table, select) {
    const result = [];
    for (let offset = 0; ; ) {
      const rows = await request(table, { select, order: 'created_at.desc,id.desc', limit: '500', offset: String(offset) });
      result.push(...rows); if (rows.length < 500) return result;
      offset += rows.length;
    }
  }
  const clientFields = '*,name:full_name';
  const projectFields = 'id,name,clientId:client_id,budget,status,dueDate:due_date,progress';
  return {
    async profile(id) {
      const rows = await request('nexo_users', { id: `eq.${id}`, select: '*' });
      if (!rows.length) throw new DatabaseError(403, 'No existe un perfil de acceso para esta cuenta.');
      return { ...rows[0], name: rows[0].display_name };
    },
    async updateProfile(id, changes) {
      const rows = await request('nexo_users', { id: `eq.${id}`, select: '*' }, { method: 'PATCH', body: JSON.stringify(changes) });
      if (!rows.length) throw new DatabaseError(403, 'No puedes modificar este perfil.');
      return { ...rows[0], name: rows[0].display_name };
    },
    recordLogin: () => request('rpc/nexo_record_login', {}, { method: 'POST', body: '{}' }),
    clients: () => list('nexo_users', clientFields),
    projects: () => list('nexo_projects', projectFields),
    async emailAvailable(email) {
      return (await request('nexo_users', { select: 'id', email: `eq.${email}`, limit: '1' })).length === 0;
    },
    async addClient(client) {
      const rows = await request('nexo_users', { select: clientFields }, { method: 'POST', body: JSON.stringify({ id: client.id, full_name: client.name, display_name: client.display_name || client.name.slice(0,60), email: client.email, sector: client.sector, phone: client.phone, job_title: client.job_title, locale: client.locale, timezone: client.timezone, theme: client.theme, notifications_enabled: client.notifications_enabled }) });
      return rows[0];
    },
    async addProject({ clientId, dueDate, ...project }) {
      const rows = await request('nexo_projects', { select: projectFields }, { method: 'POST', body: JSON.stringify({ ...project, client_id: clientId, due_date: dueDate }) });
      return rows[0];
    },
    async updateProject(id, changes) {
      const rows = await request('nexo_projects', { id: `eq.${id}`, select: projectFields }, { method: 'PATCH', body: JSON.stringify(changes) });
      if (!rows.length) throw new DatabaseError(404, 'Proyecto no encontrado.');
      return rows[0];
    },
    async activity() {
      const rows = await request('nexo_activity', { select: 'id,payload,created_at', order: 'created_at.desc,id.desc', limit: '50' });
      return rows.map(row => ({ id: row.id, text: row.payload.text, time: row.created_at }));
    },
  };
}
