-- Una única entidad para usuarios y clientes, con las mismas 15 columnas.
-- Se conservan los clientes existentes y las referencias de sus proyectos.
drop policy nexo_users_read on public.nexo_users;
drop policy nexo_users_update_self on public.nexo_users;
alter table public.nexo_users drop constraint nexo_users_id_fkey;
alter table public.nexo_users alter column id type text using id::text;
alter table public.nexo_users alter column id set default gen_random_uuid()::text;
alter table public.nexo_users rename column department to sector;
alter table public.nexo_users add constraint nexo_users_sector_length check (char_length(sector) <= 60);
create or replace function nexo_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.nexo_users where id = (select auth.uid())::text and role = 'admin');
$$;
create or replace function public.nexo_record_login() returns void
language sql security definer set search_path = '' as $$
 update public.nexo_users set last_login_at = clock_timestamp() where id = (select auth.uid())::text;
$$;
alter table public.nexo_projects drop constraint nexo_projects_client_id_fkey;
insert into public.nexo_users(id,email,full_name,display_name,sector,created_at)
select id,email,name,left(name,60),sector,created_at from public.nexo_clients
on conflict (email) do update set sector=excluded.sector;
update public.nexo_projects p set client_id=u.id
from public.nexo_clients c join public.nexo_users u on u.email=c.email
where p.client_id=c.id and p.client_id is distinct from u.id;
alter table public.nexo_projects add constraint nexo_projects_client_id_fkey
foreign key(client_id) references public.nexo_users(id) on update cascade on delete restrict;
drop table public.nexo_clients;

create policy nexo_users_read on public.nexo_users for select to authenticated
using (id=(select auth.uid())::text or (select nexo_private.is_admin()));
create policy nexo_users_update_self on public.nexo_users for update to authenticated
using (id=(select auth.uid())::text) with check (id=(select auth.uid())::text);
grant insert(id,email,full_name,display_name,sector) on public.nexo_users to authenticated;
create policy nexo_users_create on public.nexo_users for insert to authenticated
with check ((select nexo_private.is_admin()) and role='user');

-- Supabase Auth conserva únicamente la identidad y las credenciales.
-- Si ya hay cliente con ese correo, se enlaza el mismo registro (sin duplicarlo).
create or replace function nexo_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.nexo_users(id,email,full_name,display_name,role)
 values(new.id::text,new.email,'Usuario Nexo','Usuario Nexo','user')
 on conflict(email) do update set id=excluded.id,role='user';
 return new;
end;
$$;
create or replace function nexo_private.sync_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.nexo_users set email=new.email where id=new.id::text;
 return new;
end;
$$;
create or replace function public.nexo_record_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare message text;
begin
 if tg_table_name='nexo_users' then message:='Alta de cliente: ' || new.full_name;
 elsif tg_op='INSERT' then message:='Nuevo proyecto: ' || new.name;
 else message:=new.name || ': ' || new.status || ' (' || new.progress || ' %)'; end if;
 insert into public.nexo_activity(payload) values(jsonb_build_object('text',message));
 return new;
end;
$$;
create trigger nexo_user_activity after insert on public.nexo_users
for each row execute function public.nexo_record_activity();
-- Un cliente solo ve sus proyectos; administración gestiona el conjunto.
alter policy nexo_projects_read on public.nexo_projects
using (client_id=(select auth.uid())::text or (select nexo_private.is_admin()));
-- El registro global contiene nombres de otros clientes: solo administración.
alter policy nexo_activity_read on public.nexo_activity using ((select nexo_private.is_admin()));
