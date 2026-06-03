-- Permite que administradores de usuarios lean y actualicen perfiles_usuarios
-- sin romper RLS ni depender de policies recursivas.

do $$
declare
  policy_record record;
begin
  if to_regclass('public.perfiles_usuarios') is null then
    return;
  end if;

  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'perfiles_usuarios'
  loop
    execute format(
      'drop policy if exists %I on public.perfiles_usuarios',
      policy_record.policyname
    );
  end loop;
end $$;

alter table public.perfiles_usuarios enable row level security;

create or replace function public.can_manage_user_permissions()
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() ->> 'email', '') = 'admin@rebagliati.com'
    or exists (
      select 1
      from public.permisos_usuarios pu
      where pu.user_id = auth.uid()
        and pu.puede_ver = true
        and pu.modulo in ('admin usuarios', 'Administrar Usuarios')
    );
$$;

grant execute on function public.can_manage_user_permissions() to authenticated;

create policy "perfiles_usuarios own_or_admin_read"
  on public.perfiles_usuarios
  for select
  to authenticated
  using (
    id = auth.uid()
    or coalesce(auth.jwt() ->> 'email', '') = 'admin@rebagliati.com'
    or public.can_manage_user_permissions()
  );

create policy "perfiles_usuarios own_or_admin_update"
  on public.perfiles_usuarios
  for update
  to authenticated
  using (
    id = auth.uid()
    or coalesce(auth.jwt() ->> 'email', '') = 'admin@rebagliati.com'
    or public.can_manage_user_permissions()
  )
  with check (
    id = auth.uid()
    or coalesce(auth.jwt() ->> 'email', '') = 'admin@rebagliati.com'
    or public.can_manage_user_permissions()
  );

create policy "perfiles_usuarios admin_insert"
  on public.perfiles_usuarios
  for insert
  to authenticated
  with check (
    coalesce(auth.jwt() ->> 'email', '') = 'admin@rebagliati.com'
    or public.can_manage_user_permissions()
  );

create policy "perfiles_usuarios admin_delete"
  on public.perfiles_usuarios
  for delete
  to authenticated
  using (
    coalesce(auth.jwt() ->> 'email', '') = 'admin@rebagliati.com'
    or public.can_manage_user_permissions()
  );
