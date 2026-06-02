-- Ventas Operativas 360: submodulos, niveles de acceso, frases administrables y Kommo.

create table if not exists public.frases_motivacionales (
  id bigserial primary key,
  texto text not null,
  autor text,
  categoria text not null default 'operacion',
  orden integer not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  unique (texto)
);

create table if not exists public.niveles_acceso_comercial (
  id bigserial primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text not null,
  permisos text[] not null default '{}',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kommo_configuracion (
  id bigserial primary key,
  nombre text not null default 'Kommo principal',
  base_url text,
  account_subdomain text,
  integration_id text,
  client_id text,
  secret_ref text,
  webhook_secret_ref text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'conectado', 'error', 'archivado')),
  ultima_sincronizacion timestamptz,
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.frases_motivacionales enable row level security;
alter table public.niveles_acceso_comercial enable row level security;
alter table public.kommo_configuracion enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'frases_motivacionales',
    'niveles_acceso_comercial',
    'kommo_configuracion'
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
        ('ventas_dashboard', 10),
        ('ventas_nueva_venta', 20),
        ('ventas_ranking', 30),
        ('ventas_metas', 40),
        ('ventas_kommo', 50),
        ('ventas_checklist', 60),
        ('ventas_grupos', 70),
        ('ventas_promesas', 80),
        ('ventas_comisiones', 90),
        ('ventas_plantillas', 100),
        ('ventas_entregables', 110),
        ('ventas_accesos', 120),
        ('ventas_alertas', 130),
        ('ventas_importador', 140),
        ('ventas_administracion', 150)
    ) as children(child_name, child_order)
    where not exists (
      select 1 from public.modulos_sistema m where m.nombre = children.child_name
    );
  end if;
end $$;

insert into public.niveles_acceso_comercial (codigo, nombre, descripcion, permisos)
values
  ('ejecutivo_comercial', 'Ejecutivo comercial', 'Opera ventas propias, checklist, promesas y plantillas activas.', array['Ventas','ventas_nueva_venta','ventas_checklist','ventas_promesas','ventas_plantillas']),
  ('supervisor_comercial', 'Supervisor / encargado', 'Controla equipo, Kommo, ranking, grupos, reasignaciones y alertas.', array['Ventas','ventas_dashboard','ventas_ranking','ventas_metas','ventas_kommo','ventas_checklist','ventas_grupos','ventas_promesas','ventas_alertas']),
  ('jefe_ventas', 'Jefe de ventas', 'Acceso completo comercial, comisiones, importador y administracion.', array['Ventas','ventas_dashboard','ventas_nueva_venta','ventas_ranking','ventas_metas','ventas_kommo','ventas_checklist','ventas_grupos','ventas_promesas','ventas_comisiones','ventas_plantillas','ventas_entregables','ventas_accesos','ventas_alertas','ventas_importador','ventas_administracion']),
  ('gerencia', 'Gerencia', 'Lectura ejecutiva de resumen, metas, alertas, rentabilidad y comisiones.', array['Ventas','ventas_dashboard','ventas_ranking','ventas_metas','ventas_comisiones','ventas_alertas','Finanzas','Reportes']),
  ('marketing_lector', 'Marketing lector', 'Lee UTMs, campanas, grupos, plantillas, eventos ganadores e importador.', array['Marketing','marketing_dashboard','marketing_campanas','marketing_metricas','Ventas','ventas_dashboard','ventas_grupos','ventas_plantillas','ventas_importador']),
  ('coordinacion_lector', 'Coordinacion lectora', 'Consulta eventos, fechas, modalidad, entregables y estado academico.', array['Ventas','ventas_dashboard','ventas_entregables','ventas_importador','Gestion Estrategica','Reportes'])
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  permisos = excluded.permisos,
  activo = true;

insert into public.frases_motivacionales (texto, categoria, orden)
values
  ('Lo que no se mide, no mejora.', 'operacion', 1),
  ('Hazlo simple, hazlo bien, hazlo hoy.', 'operacion', 2),
  ('Un buen sistema reduce errores.', 'procesos', 3),
  ('La comunicacion evita errores.', 'equipo', 4),
  ('Automatiza lo repetitivo.', 'procesos', 5),
  ('Cada detalle suma.', 'calidad', 6),
  ('Mide y mejora.', 'operacion', 7),
  ('Procesos claros, resultados claros.', 'procesos', 8)
on conflict (texto) do update set
  categoria = excluded.categoria,
  orden = excluded.orden,
  activa = true;

insert into public.kommo_configuracion (nombre, estado, observacion)
select 'Kommo principal', 'pendiente', 'Configurar OAuth/API y guardar secretos fuera del frontend.'
where not exists (select 1 from public.kommo_configuracion where nombre = 'Kommo principal');
