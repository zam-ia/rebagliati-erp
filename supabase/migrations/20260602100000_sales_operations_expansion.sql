-- Expansion operativa del modulo Ventas.
-- Soporta levantamiento de procesos: Kommo, promesas de pago, comisiones,
-- incidencias, entregables mensuales y fuentes Google Sheet.

create table if not exists public.ventas_kommo_turnos (
  id bigserial primary key,
  fecha date not null,
  turno text not null default 'manana' check (turno in ('manana', 'tarde', 'noche', 'mixto')),
  mensajes_sin_asignar integer not null default 0 check (mensajes_sin_asignar >= 0),
  usuarios_activos integer not null default 0 check (usuarios_activos >= 0),
  mensajes_redes_sin_leer integer not null default 0 check (mensajes_redes_sin_leer >= 0),
  whatsapp_disponibles integer not null default 0 check (whatsapp_disponibles >= 0),
  minutos_asignacion_manual integer not null default 0 check (minutos_asignacion_manual >= 0),
  minutos_2fa integer not null default 0 check (minutos_2fa >= 0),
  observacion text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (fecha, turno)
);

create table if not exists public.ventas_promesas_pago (
  id bigserial primary key,
  lead_nombre text not null,
  lead_contacto text,
  executive_original_id bigint references public.ventas_ejecutivos(id) on delete set null,
  executive_actual_id bigint references public.ventas_ejecutivos(id) on delete set null,
  venta_registro_id bigint references public.ventas_registros(id) on delete set null,
  monto numeric(12,2) not null default 0 check (monto >= 0),
  fecha_promesa date not null,
  estado text not null default 'vigente' check (estado in ('vigente', 'por_vencer', 'vencida', 'pagada', 'perdida')),
  motivo_reasignacion text,
  regla_comision text not null default 'propietario_original',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_incidencias (
  id bigserial primary key,
  executive_id bigint references public.ventas_ejecutivos(id) on delete cascade,
  fecha date not null,
  tipo text not null,
  severidad text not null default 'media' check (severidad in ('baja', 'media', 'alta', 'critica')),
  descripcion text,
  descuento_actual numeric(12,2) not null default 0,
  descuento_sugerido numeric(12,2) not null default 0,
  estado text not null default 'abierta' check (estado in ('abierta', 'validada', 'desestimada', 'cerrada')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ventas_comisiones_modelos (
  id bigserial primary key,
  nombre text not null,
  meta_total integer not null default 180,
  diplomado_unit numeric(12,2) not null default 6,
  curso_modular_unit numeric(12,2) not null default 2,
  curso_unit numeric(12,2) not null default 1,
  mix_diplomado numeric(5,2) not null default 50,
  mix_curso_modular numeric(5,2) not null default 15,
  mix_curso numeric(5,2) not null default 35,
  beneficios_json jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ventas_entregables_mensuales (
  id bigserial primary key,
  periodo_id bigint references public.ventas_periodos(id) on delete cascade,
  nombre text not null,
  responsable text,
  ventana text not null default 'Dia 1 al 4',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'listo', 'bloqueado')),
  fuente text,
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_fuentes_google (
  id bigserial primary key,
  nombre text not null,
  tipo text not null check (tipo in ('sheet', 'doc')),
  url text not null,
  gid text,
  proposito text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'conectado', 'error', 'archivado')),
  ultima_sincronizacion timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ventas_kommo_turnos_fecha on public.ventas_kommo_turnos(fecha, turno);
create index if not exists idx_ventas_promesas_estado_fecha on public.ventas_promesas_pago(estado, fecha_promesa);
create index if not exists idx_ventas_incidencias_exec_fecha on public.ventas_incidencias(executive_id, fecha);
create index if not exists idx_ventas_entregables_periodo_estado on public.ventas_entregables_mensuales(periodo_id, estado);

alter table public.ventas_kommo_turnos enable row level security;
alter table public.ventas_promesas_pago enable row level security;
alter table public.ventas_incidencias enable row level security;
alter table public.ventas_comisiones_modelos enable row level security;
alter table public.ventas_entregables_mensuales enable row level security;
alter table public.ventas_fuentes_google enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'ventas_kommo_turnos',
    'ventas_promesas_pago',
    'ventas_incidencias',
    'ventas_comisiones_modelos',
    'ventas_entregables_mensuales',
    'ventas_fuentes_google'
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

insert into public.ventas_comisiones_modelos (
  nombre,
  meta_total,
  diplomado_unit,
  curso_modular_unit,
  curso_unit,
  mix_diplomado,
  mix_curso_modular,
  mix_curso,
  beneficios_json
)
select
  'Modelo base ajustado 2026',
  180,
  6,
  2,
  1,
  50,
  15,
  35,
  '["Vale de consumo", "Medio dia libre", "Prioridad en bases ganadoras", "Reconocimiento interno"]'::jsonb
where not exists (
  select 1 from public.ventas_comisiones_modelos where nombre = 'Modelo base ajustado 2026'
);

insert into public.ventas_fuentes_google (nombre, tipo, url, gid, proposito)
values
  ('Plan de mejora ventas', 'doc', 'https://docs.google.com/document/d/1wlUxX1lbC8cJid2WEgsaieftKywsWz8flaxvR5OINNk/edit', null, 'Documento de levantamiento y mejora'),
  ('Seguimiento de llamadas', 'sheet', 'https://docs.google.com/spreadsheets/d/1B4AxQafkVJepaML8xGi_O6JlS6qgLGU_pNDBHVpABsE/edit', '2029277418', 'Llamadas, incidencias y seguimiento'),
  ('Arquitectura ventas', 'doc', 'https://docs.google.com/document/d/1JrZPOnSIiwZy8p2B2VhjLJ7LAjYD5CJPIY0k3CMm_hM/edit', null, 'Arquitectura funcional'),
  ('Ranking ventas', 'sheet', 'https://docs.google.com/spreadsheets/d/1kM_5yDfWpHzfYER1ZI4cMNfdO0FEqgCVMDSBzyKdFrY/edit', '1239433632', 'Ranking y metas'),
  ('Eventos 2026', 'sheet', 'https://docs.google.com/spreadsheets/d/1LL8iCoxpjQUl8uAQoGwFGFHSZszGlTJlc0LYlktzXuQ/edit', '1730488467', 'Catalogo historico de eventos')
on conflict do nothing;
