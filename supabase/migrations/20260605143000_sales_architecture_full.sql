do $$
declare
  ventas_id bigint;
begin
  if to_regclass('public.modulos_sistema') is not null then
    select id into ventas_id from public.modulos_sistema where nombre = 'Ventas' limit 1;

    if ventas_id is null then
      insert into public.modulos_sistema (nombre, parent_id, orden)
      values ('Ventas', null, 4)
      returning id into ventas_id;
    end if;

    insert into public.modulos_sistema (nombre, parent_id, orden)
    select child_name, ventas_id, child_order
    from (
      values
        ('ventas_seguimiento', 25),
        ('ventas_eventos', 55),
        ('ventas_marketing', 65),
        ('ventas_biblioteca', 95),
        ('ventas_show', 105),
        ('ventas_coordinacion', 115)
    ) as children(child_name, child_order)
    where not exists (
      select 1 from public.modulos_sistema m where m.nombre = children.child_name
    );
  end if;
end $$;

create table if not exists public.ventas_seguimientos (
  id bigserial primary key,
  lead_id bigint references public.ventas_leads(id) on delete set null,
  executive_id bigint references public.ventas_ejecutivos(id) on delete set null,
  evento_codigo text,
  fase text not null default 'LEAD NUEVO',
  proxima_accion text,
  fecha_accion timestamptz,
  sla_minutos integer not null default 10,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'completado', 'vencido', 'cancelado')),
  prioridad text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'critica')),
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_campanas_utm (
  id bigserial primary key,
  nombre text not null,
  fuente text,
  evento_codigo text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  inversion numeric(12,2) not null default 0,
  leads integer not null default 0,
  ventas integer not null default 0,
  descuento_promedio numeric(8,2) not null default 0,
  estado text not null default 'medir' check (estado in ('medir', 'rentable', 'observar', 'escalar', 'archivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_biblioteca_comercial (
  id bigserial primary key,
  nombre text not null,
  tipo text not null default 'plantilla',
  evento_codigo text,
  url text,
  version text not null default 'v1',
  responsable text,
  estado text not null default 'revision' check (estado in ('revision', 'aprobado', 'activo', 'obsoleto', 'archivado')),
  uso_recomendado text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_show_ventas (
  id bigserial primary key,
  evento_codigo text,
  evento_nombre text not null,
  fecha date not null,
  moderador text,
  objetivo integer not null default 0,
  asistentes integer not null default 0,
  leads_calientes integer not null default 0,
  cierres integer not null default 0,
  guion_url text,
  estado text not null default 'programado' check (estado in ('programado', 'en_seguimiento', 'cerrado', 'cancelado', 'pendiente_guion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_coordinacion_sla (
  id bigserial primary key,
  evento_codigo text,
  evento_nombre text,
  solicitud text not null,
  responsable text,
  prioridad text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'critica')),
  sla_horas integer not null default 8,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'resuelto', 'escalado', 'cancelado')),
  respuesta text,
  fecha_limite timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ventas_seguimientos_estado on public.ventas_seguimientos(estado, prioridad);
create index if not exists idx_ventas_seguimientos_lead on public.ventas_seguimientos(lead_id);
create index if not exists idx_ventas_campanas_utm_evento on public.ventas_campanas_utm(evento_codigo);
create index if not exists idx_ventas_biblioteca_estado on public.ventas_biblioteca_comercial(estado, tipo);
create index if not exists idx_ventas_show_fecha on public.ventas_show_ventas(fecha);
create index if not exists idx_ventas_coordinacion_estado on public.ventas_coordinacion_sla(estado, prioridad);

alter table public.ventas_seguimientos enable row level security;
alter table public.ventas_campanas_utm enable row level security;
alter table public.ventas_biblioteca_comercial enable row level security;
alter table public.ventas_show_ventas enable row level security;
alter table public.ventas_coordinacion_sla enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'ventas_seguimientos',
    'ventas_campanas_utm',
    'ventas_biblioteca_comercial',
    'ventas_show_ventas',
    'ventas_coordinacion_sla'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = v_table
        and policyname = format('%s authenticated read', v_table)
    ) then
      execute format(
        'create policy "%1$s authenticated read" on public.%1$I for select to authenticated using (true)',
        v_table
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = v_table
        and policyname = format('%s authenticated write', v_table)
    ) then
      execute format(
        'create policy "%1$s authenticated write" on public.%1$I for all to authenticated using (true) with check (true)',
        v_table
      );
    end if;
  end loop;
end $$;

insert into public.niveles_acceso_comercial (codigo, nombre, descripcion, permisos)
values
  ('ejecutivo_comercial', 'Ejecutivo comercial', 'Opera leads propios, seguimiento, ventas, promesas y biblioteca activa.', array['Ventas','ventas_seguimiento','ventas_nueva_venta','ventas_kommo','ventas_promesas','ventas_biblioteca','ventas_plantillas']),
  ('supervisor_comercial', 'Supervisor / encargado', 'Controla turno, leads, seguimiento, ranking, promesas, show de ventas y alertas.', array['Ventas','ventas_dashboard','ventas_seguimiento','ventas_ranking','ventas_metas','ventas_kommo','ventas_eventos','ventas_checklist','ventas_grupos','ventas_promesas','ventas_show','ventas_alertas']),
  ('jefe_ventas', 'Jefe de ventas', 'Acceso integral al flujo comercial, integraciones, reportes y gobierno de ventas.', array['Ventas','ventas_dashboard','ventas_seguimiento','ventas_nueva_venta','ventas_ranking','ventas_metas','ventas_kommo','ventas_eventos','ventas_marketing','ventas_checklist','ventas_grupos','ventas_promesas','ventas_comisiones','ventas_biblioteca','ventas_show','ventas_coordinacion','ventas_plantillas','ventas_entregables','ventas_accesos','ventas_alertas','ventas_importador','ventas_administracion']),
  ('gerencia', 'Gerencia', 'Lectura ejecutiva de panel diario, ranking, metas, marketing, comisiones, reportes y alertas.', array['Ventas','ventas_dashboard','ventas_ranking','ventas_metas','ventas_eventos','ventas_marketing','ventas_comisiones','ventas_entregables','ventas_alertas','Finanzas','Reportes']),
  ('marketing_lector', 'Marketing lector', 'Lee campanas, UTMs, eventos, biblioteca, comunidades y fuentes de importacion.', array['Marketing','marketing_dashboard','marketing_campanas','marketing_metricas','Ventas','ventas_marketing','ventas_eventos','ventas_biblioteca','ventas_grupos','ventas_importador']),
  ('coordinacion_lector', 'Coordinacion lectora', 'Gestiona consultas academicas, eventos, biblioteca y reportes relacionados.', array['Ventas','ventas_eventos','ventas_coordinacion','ventas_biblioteca','ventas_entregables','Gestion Estrategica','Reportes'])
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  permisos = excluded.permisos,
  activo = true;
