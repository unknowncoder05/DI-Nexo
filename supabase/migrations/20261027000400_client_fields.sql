-- Alta de la entidad unificada con los datos y preferencias del formulario.
-- RLS sigue permitiendo INSERT solo a administradores y rol inicial 'user'.
-- No se conceden permisos de escritura para role ni las fechas de auditoría.
grant insert(phone,job_title,locale,timezone,theme,notifications_enabled)
on public.nexo_users to authenticated;
