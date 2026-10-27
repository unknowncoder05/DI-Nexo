-- Datos de negocio y documentos de actividad; solo Express tiene acceso.
create table public.nexo_clients (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254),
  sector text not null check (char_length(btrim(sector)) between 2 and 60),
  created_at timestamptz not null default now(),
  constraint nexo_clients_email_key unique (email)
);
create table public.nexo_projects (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  client_id text not null references public.nexo_clients(id) on delete restrict,
  budget numeric(12,2) not null check (budget between 0 and 10000000),
  status text not null default 'Pendiente' check (status in ('Pendiente','En curso','Completado')),
  due_date date not null,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  constraint nexo_project_progress check (
    (status = 'Pendiente' and progress = 0) or
    (status = 'Completado' and progress = 100) or status = 'En curso'
  )
);
create index nexo_projects_client_idx on public.nexo_projects(client_id);
create table public.nexo_activity (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null check (jsonb_typeof(payload->'text') = 'string' and payload ? 'text'),
  created_at timestamptz not null default now()
);
create index nexo_activity_created_idx on public.nexo_activity(created_at desc, id desc);

alter table public.nexo_clients enable row level security;
alter table public.nexo_projects enable row level security;
alter table public.nexo_activity enable row level security;
revoke all on public.nexo_clients, public.nexo_projects, public.nexo_activity from public, anon, authenticated;
grant select, insert on public.nexo_clients to service_role;
grant select, insert, update on public.nexo_projects to service_role;
grant select, insert on public.nexo_activity to service_role;

-- El registro y su evento se guardan en la misma transacción.
create function public.nexo_record_activity() returns trigger
language plpgsql set search_path = '' as $$
declare message text;
begin
  if tg_table_name = 'nexo_clients' then
    message := 'Alta de cliente: ' || new.name;
  elsif tg_op = 'INSERT' then
    message := 'Nuevo proyecto: ' || new.name;
  else
    message := new.name || ': ' || new.status || ' (' || new.progress || ' %)';
  end if;
  insert into public.nexo_activity(payload) values (jsonb_build_object('text', message));
  return new;
end;
$$;
revoke all on function public.nexo_record_activity() from public, anon, authenticated;
create trigger nexo_client_activity after insert on public.nexo_clients
for each row execute function public.nexo_record_activity();
create trigger nexo_project_activity after insert or update on public.nexo_projects
for each row execute function public.nexo_record_activity();
