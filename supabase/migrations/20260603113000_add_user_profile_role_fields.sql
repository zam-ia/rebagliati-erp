alter table if exists public.perfiles_usuarios
  add column if not exists cargo text,
  add column if not exists rol text,
  add column if not exists perfil_auto boolean not null default true;

comment on column public.perfiles_usuarios.cargo is 'Cargo visible en administracion de usuarios.';
comment on column public.perfiles_usuarios.rol is 'Rol visible en administracion de usuarios.';
comment on column public.perfiles_usuarios.perfil_auto is 'Si es true, cargo y rol se recalculan por permisos asignados.';
