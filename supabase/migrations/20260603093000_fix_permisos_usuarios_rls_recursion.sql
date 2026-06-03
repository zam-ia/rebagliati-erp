-- Corrige recursión infinita en políticas RLS de permisos_usuarios.
-- Causa: alguna policy consulta permisos_usuarios dentro de permisos_usuarios.
-- Solución: reemplazar policies por reglas que no consultan la misma tabla.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'permisos_usuarios'
  loop
    execute format(
      'drop policy if exists %I on public.permisos_usuarios',
      policy_record.policyname
    );
  end loop;
end $$;

alter table public.permisos_usuarios enable row level security;

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

create policy "permisos_usuarios own_or_admin_read"
  on public.permisos_usuarios
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_user_permissions()
  );

create policy "permisos_usuarios admin_insert"
  on public.permisos_usuarios
  for insert
  to authenticated
  with check (
    public.can_manage_user_permissions()
  );

create policy "permisos_usuarios admin_update"
  on public.permisos_usuarios
  for update
  to authenticated
  using (
    public.can_manage_user_permissions()
  )
  with check (
    public.can_manage_user_permissions()
  );

create policy "permisos_usuarios admin_delete"
  on public.permisos_usuarios
  for delete
  to authenticated
  using (
    public.can_manage_user_permissions()
  );
