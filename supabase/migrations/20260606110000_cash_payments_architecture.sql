do $$
declare
  caja_id bigint;
begin
  if to_regclass('public.modulos_sistema') is not null then
    select id into caja_id from public.modulos_sistema where nombre in ('Caja', 'Caja y Pagos') limit 1;

    if caja_id is null then
      insert into public.modulos_sistema (nombre, parent_id, orden)
      values ('Caja', null, 5)
      returning id into caja_id;
    end if;

    insert into public.modulos_sistema (nombre, parent_id, orden)
    select child_name, caja_id, child_order
    from (
      values
        ('caja_dashboard', 10),
        ('caja_turnos', 20),
        ('caja_ingresos', 30),
        ('caja_egresos', 40),
        ('caja_arqueo', 50),
        ('caja_rendicion', 60),
        ('caja_conciliacion', 70),
        ('caja_historico', 80),
        ('caja_reportes', 90),
        ('caja_parametros', 100)
    ) as children(child_name, child_order)
    where not exists (
      select 1 from public.modulos_sistema m where m.nombre = children.child_name
    );
  end if;
end $$;

alter table if exists public.pagos
  add column if not exists canal_pos text,
  add column if not exists numero_operacion text,
  add column if not exists tipo_documento text,
  add column if not exists documento_cliente text,
  add column if not exists comprobante_url text,
  add column if not exists observacion_caja text,
  add column if not exists estado_caja text not null default 'validado';

create table if not exists public.caja_turnos (
  id bigserial primary key,
  fecha date not null default current_date,
  turno text not null check (turno in ('manana', 'noche')),
  caja_nombre text not null default 'Caja principal',
  responsable text not null,
  dni_responsable text,
  saldo_inicial numeric(12,2) not null default 0,
  saldo_final numeric(12,2) not null default 0,
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado', 'anulado')),
  abierto_at timestamptz not null default now(),
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fecha, turno, caja_nombre)
);

create table if not exists public.caja_movimientos (
  id bigserial primary key,
  turno_id bigint references public.caja_turnos(id) on delete set null,
  pago_id bigint,
  egreso_id bigint,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  fecha_movimiento timestamptz not null default now(),
  turno text not null default 'manana' check (turno in ('manana', 'noche')),
  concepto text not null,
  area text,
  categoria text,
  monto numeric(12,2) not null check (monto > 0),
  metodo_pago text not null default 'efectivo',
  canal_pos text,
  numero_operacion text,
  tipo_documento text,
  documento_cliente text,
  tipo_comprobante text,
  numero_comprobante text,
  responsable text,
  comprobante_url text,
  observacion text,
  estado text not null default 'validado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caja_arqueos (
  id bigserial primary key,
  turno_id bigint references public.caja_turnos(id) on delete set null,
  fecha date not null default current_date,
  turno text not null default 'manana' check (turno in ('manana', 'noche')),
  denominaciones jsonb not null default '{}'::jsonb,
  monto_fisico numeric(12,2) not null default 0,
  saldo_esperado numeric(12,2) not null default 0,
  diferencia numeric(12,2) not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'cuadrado', 'diferencia', 'autorizado')),
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caja_rendiciones (
  id bigserial primary key,
  turno_id bigint references public.caja_turnos(id) on delete set null,
  fecha date not null default current_date,
  turno text not null default 'manana' check (turno in ('manana', 'noche')),
  monto numeric(12,2) not null check (monto > 0),
  responsable_entrega text not null,
  responsable_recibe text not null,
  medio text not null default 'efectivo',
  estado text not null default 'validado' check (estado in ('pendiente', 'validado', 'observado', 'anulado')),
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caja_conciliaciones (
  id bigserial primary key,
  movimiento_id bigint references public.caja_movimientos(id) on delete set null,
  fecha_operacion date not null default current_date,
  metodo_pago text not null,
  canal_pos text,
  numero_operacion text not null,
  monto numeric(12,2) not null check (monto > 0),
  cuenta_destino text,
  titular text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'conciliado', 'observado', 'anulado')),
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caja_parametros (
  id bigserial primary key,
  grupo text not null,
  codigo text not null,
  nombre text not null,
  valor jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo, codigo)
);

create table if not exists public.caja_auditoria (
  id bigserial primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  detail text,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_caja_turnos_fecha_turno on public.caja_turnos(fecha, turno);
create index if not exists idx_caja_movimientos_fecha_tipo on public.caja_movimientos(fecha_movimiento, tipo);
create index if not exists idx_caja_movimientos_operacion on public.caja_movimientos(numero_operacion);
create index if not exists idx_caja_movimientos_comprobante on public.caja_movimientos(tipo_comprobante, numero_comprobante);
create index if not exists idx_caja_arqueos_fecha_turno on public.caja_arqueos(fecha, turno);
create index if not exists idx_caja_rendiciones_fecha_turno on public.caja_rendiciones(fecha, turno);
create index if not exists idx_caja_conciliaciones_operacion on public.caja_conciliaciones(numero_operacion);
create index if not exists idx_caja_auditoria_created_at on public.caja_auditoria(created_at desc);

alter table public.caja_turnos enable row level security;
alter table public.caja_movimientos enable row level security;
alter table public.caja_arqueos enable row level security;
alter table public.caja_rendiciones enable row level security;
alter table public.caja_conciliaciones enable row level security;
alter table public.caja_parametros enable row level security;
alter table public.caja_auditoria enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'caja_turnos',
    'caja_movimientos',
    'caja_arqueos',
    'caja_rendiciones',
    'caja_conciliaciones',
    'caja_parametros',
    'caja_auditoria'
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

insert into public.caja_parametros (grupo, codigo, nombre, valor, orden)
values
  ('tipo_documento', '01', 'DNI', '{"sunat":"01"}', 10),
  ('tipo_documento', '06', 'RUC', '{"sunat":"06"}', 20),
  ('metodo_pago', 'efectivo', 'Efectivo', '{"tipo":"fisico"}', 10),
  ('metodo_pago', 'pos', 'P.O.S.', '{"tipo":"digital","requiere_operacion":true}', 20),
  ('metodo_pago', 'transferencia', 'Transferencia', '{"tipo":"digital","requiere_operacion":true}', 30),
  ('metodo_pago', 'yape', 'Yape', '{"tipo":"digital","requiere_operacion":true}', 40),
  ('metodo_pago', 'plin', 'Plin', '{"tipo":"digital","requiere_operacion":true}', 50),
  ('regla', 'efectivo_alto', 'Efectivo alto requiere rendicion sugerida', '{"monto":700}', 10),
  ('regla', 'voucher_obligatorio', 'Voucher legible obligatorio para validar pago', '{"bloquea_comision":true}', 20)
on conflict (grupo, codigo) do update set
  nombre = excluded.nombre,
  valor = excluded.valor,
  activo = true,
  orden = excluded.orden,
  updated_at = now();
