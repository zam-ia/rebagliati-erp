-- Enlace de ejecutivos comerciales con RR.HH. y bitacora de cambios de ventas.

alter table if exists public.ventas_ejecutivos
  add column if not exists hr_person_type text check (hr_person_type in ('empleado', 'locador', 'manual')),
  -- Accept text to allow numeric ids and UUIDs from RR.HH. (empleados/locadores)
  add column if not exists hr_person_id text,
  add column if not exists hr_linked_at timestamptz;

create index if not exists idx_ventas_ejecutivos_hr_person
  on public.ventas_ejecutivos(hr_person_type, hr_person_id);

create table if not exists public.ventas_auditoria (
  id bigserial primary key,
  module text not null default 'ventas',
  action text not null,
  entity_type text,
  entity_id text,
  detail text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ventas_auditoria_created_at
  on public.ventas_auditoria(created_at desc);

create index if not exists idx_ventas_auditoria_entity
  on public.ventas_auditoria(entity_type, entity_id);

alter table public.ventas_auditoria enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ventas_auditoria'
      and policyname = 'ventas_auditoria authenticated read'
  ) then
    create policy "ventas_auditoria authenticated read"
      on public.ventas_auditoria
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ventas_auditoria'
      and policyname = 'ventas_auditoria authenticated write'
  ) then
    create policy "ventas_auditoria authenticated write"
      on public.ventas_auditoria
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
declare
  ventas_id bigint;
begin
  if to_regclass('public.modulos_sistema') is not null then
    select id into ventas_id from public.modulos_sistema where nombre = 'Ventas' limit 1;

    if ventas_id is not null then
      update public.modulos_sistema
      set orden = 110
      where nombre = 'ventas_entregables'
        and parent_id = ventas_id;
    end if;
  end if;
end $$;
