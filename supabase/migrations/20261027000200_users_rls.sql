-- Perfil de aplicación: exactamente 15 columnas. Credenciales en auth.users.
create table public.nexo_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  role text not null default 'user' check (role in ('admin','user')),
  phone text not null default '' check (char_length(phone) <= 30),
  job_title text not null default '' check (char_length(job_title) <= 80),
  department text not null default '' check (char_length(department) <= 80),
  locale text not null default 'es-ES' check (locale in ('es-ES','en-GB')),
  timezone text not null default 'Europe/Madrid' check (timezone in ('Europe/Madrid','UTC','America/Bogota')),
  theme text not null default 'light' check (theme in ('light','dark','system')),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);
alter table public.nexo_users enable row level security;
revoke all on public.nexo_users from public, anon, authenticated;
grant select on public.nexo_users to authenticated;
grant update(full_name,display_name,phone,job_title,department,locale,timezone,theme,notifications_enabled) on public.nexo_users to authenticated;
grant all on public.nexo_users to service_role;

create schema if not exists nexo_private;
revoke all on schema nexo_private from public;
grant usage on schema nexo_private to authenticated;
create function nexo_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.nexo_users where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function nexo_private.is_admin() from public;
grant execute on function nexo_private.is_admin() to authenticated;
create policy nexo_users_read on public.nexo_users for select to authenticated
using (id = (select auth.uid()) or (select nexo_private.is_admin()));
create policy nexo_users_update_self on public.nexo_users for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function nexo_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.nexo_users(id,email,full_name,display_name,role)
  values(new.id,new.email,'Usuario Nexo','Usuario Nexo','user');
  return new;
end;
$$;
revoke all on function nexo_private.create_profile() from public;
create trigger nexo_auth_user_created after insert on auth.users
for each row execute function nexo_private.create_profile();

create function nexo_private.sync_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.nexo_users set email = new.email where id = new.id;
  return new;
end;
$$;
revoke all on function nexo_private.sync_email() from public;
create trigger nexo_auth_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email) execute function nexo_private.sync_email();

create function nexo_private.touch_profile() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end;
$$;
revoke all on function nexo_private.touch_profile() from public;
create trigger nexo_profile_updated before update on public.nexo_users
for each row execute function nexo_private.touch_profile();

create function public.nexo_record_login() returns void
language sql security definer set search_path = '' as $$
  update public.nexo_users set last_login_at = clock_timestamp() where id = (select auth.uid());
$$;
revoke all on function public.nexo_record_login() from public, anon;
grant execute on function public.nexo_record_login() to authenticated;

-- La identidad auth.uid() y el rol persistido se comprueban también al llamar
-- directamente a PostgREST, sin pasar por Express.
grant select on public.nexo_clients, public.nexo_projects, public.nexo_activity to authenticated;
grant insert on public.nexo_clients, public.nexo_projects to authenticated;
grant update(status,progress) on public.nexo_projects to authenticated;
create policy nexo_clients_read on public.nexo_clients for select to authenticated using (true);
create policy nexo_clients_create on public.nexo_clients for insert to authenticated with check ((select nexo_private.is_admin()));
create policy nexo_projects_read on public.nexo_projects for select to authenticated using (true);
create policy nexo_projects_create on public.nexo_projects for insert to authenticated with check ((select nexo_private.is_admin()));
create policy nexo_projects_update on public.nexo_projects for update to authenticated
using ((select nexo_private.is_admin())) with check ((select nexo_private.is_admin()));
create policy nexo_activity_read on public.nexo_activity for select to authenticated using (true);
-- Solo el trigger puede escribir actividad. No se concede INSERT al usuario.
alter function public.nexo_record_activity() security definer;

-- Los usuarios Auth preexistentes reciben un perfil estándar, nunca admin por metadatos.
insert into public.nexo_users(id,email,full_name,display_name,role)
select id,email,'Usuario Nexo','Usuario Nexo','user' from auth.users where email is not null
on conflict (id) do nothing;
