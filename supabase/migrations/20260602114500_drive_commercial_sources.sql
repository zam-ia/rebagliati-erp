-- Modelo de importacion para archivos descargados desde Drive.
-- Normaliza eventos, UTMs, estrategias, llamadas, ranking, plantillas y controles de pago.

create table if not exists public.drive_comercial_fuentes (
  id bigserial primary key,
  nombre text not null unique,
  area text not null,
  tipo text not null,
  ruta_origen text,
  hojas text[] not null default '{}',
  campos text[] not null default '{}',
  filas_detectadas integer not null default 0 check (filas_detectadas >= 0),
  uso_operativo text,
  estado text not null default 'catalogado' check (estado in ('catalogado', 'importado', 'error', 'archivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_eventos_drive (
  id bigserial primary key,
  fuente_id bigint references public.drive_comercial_fuentes(id) on delete set null,
  mes text not null,
  codigo text,
  evento text not null,
  modalidad text,
  fecha_inicio date,
  fecha_termino date,
  horario text,
  creditos numeric(8,2),
  ficha_url text,
  whatsapp_url text,
  zoom_url text,
  observacion text,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (mes, codigo, evento)
);

create table if not exists public.marketing_utms_drive (
  id bigserial primary key,
  fuente_id bigint references public.drive_comercial_fuentes(id) on delete set null,
  mes text not null,
  codigo text,
  grado_academico text,
  tipo_evento text,
  modalidad_evento text,
  producto text,
  oracion_clave text,
  utm_campana text,
  utm_conjunto text,
  utm_anuncio text,
  celular text,
  grupo_usuario text,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_estrategias_drive (
  id bigserial primary key,
  fuente_id bigint references public.drive_comercial_fuentes(id) on delete set null,
  codigo text,
  evento text not null,
  modalidad text,
  fecha_inicio date,
  estrategia text,
  estado text,
  activo_url text,
  inscritos_inicio integer,
  inscritos_progreso integer,
  incremento integer generated always as (coalesce(inscritos_progreso, 0) - coalesce(inscritos_inicio, 0)) stored,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ventas_llamadas_drive (
  id bigserial primary key,
  fuente_id bigint references public.drive_comercial_fuentes(id) on delete set null,
  mes text not null,
  numero text,
  kommo text,
  executive_id bigint references public.ventas_ejecutivos(id) on delete set null,
  ejecutivo_nombre text,
  evento text not null,
  codigo text,
  fecha_inicio date,
  preinscritos integer not null default 0 check (preinscritos >= 0),
  inscritos integer not null default 0 check (inscritos >= 0),
  conversion numeric(8,2) generated always as (
    case when preinscritos > 0 then round((inscritos::numeric / preinscritos::numeric) * 100, 2) else 0 end
  ) stored,
  observacion text,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ventas_ranking_drive (
  id bigserial primary key,
  fuente_id bigint references public.drive_comercial_fuentes(id) on delete set null,
  fecha date not null,
  executive_id bigint references public.ventas_ejecutivos(id) on delete set null,
  ejecutivo_nombre text not null,
  cursos integer not null default 0,
  cursos_modulares integer not null default 0,
  diplomados integer not null default 0,
  puntaje_comision numeric(12,2) generated always as (
    coalesce(cursos, 0) * 1 + coalesce(cursos_modulares, 0) * 2 + coalesce(diplomados, 0) * 6
  ) stored,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fecha, ejecutivo_nombre)
);

create table if not exists public.marketing_plantillas_drive (
  id bigserial primary key,
  fuente_id bigint references public.drive_comercial_fuentes(id) on delete set null,
  tipo text not null check (tipo in ('automatizacion', 'informativa', 'pago', 'evento')),
  codigo text,
  titulo text not null,
  contenido text not null,
  version integer not null default 1,
  estado text not null default 'borrador' check (estado in ('borrador', 'revision', 'aprobada', 'activa', 'archivada')),
  aprobador text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caja_controles_pago_drive (
  id bigserial primary key,
  tipo_programa text not null,
  regla text not null,
  severidad text not null default 'media' check (severidad in ('baja', 'media', 'alta', 'critica')),
  requiere_voucher boolean not null default true,
  bloquea_comision boolean not null default false,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  unique (tipo_programa, regla)
);

create index if not exists idx_marketing_eventos_drive_codigo on public.marketing_eventos_drive(codigo);
create index if not exists idx_marketing_utms_drive_codigo on public.marketing_utms_drive(codigo);
create index if not exists idx_marketing_estrategias_drive_codigo on public.marketing_estrategias_drive(codigo);
create index if not exists idx_ventas_llamadas_drive_codigo on public.ventas_llamadas_drive(codigo);
create index if not exists idx_ventas_llamadas_drive_conversion on public.ventas_llamadas_drive(conversion desc);
create index if not exists idx_ventas_ranking_drive_fecha on public.ventas_ranking_drive(fecha);

alter table public.drive_comercial_fuentes enable row level security;
alter table public.marketing_eventos_drive enable row level security;
alter table public.marketing_utms_drive enable row level security;
alter table public.marketing_estrategias_drive enable row level security;
alter table public.ventas_llamadas_drive enable row level security;
alter table public.ventas_ranking_drive enable row level security;
alter table public.marketing_plantillas_drive enable row level security;
alter table public.caja_controles_pago_drive enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'drive_comercial_fuentes',
    'marketing_eventos_drive',
    'marketing_utms_drive',
    'marketing_estrategias_drive',
    'ventas_llamadas_drive',
    'ventas_ranking_drive',
    'marketing_plantillas_drive',
    'caja_controles_pago_drive'
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

insert into public.drive_comercial_fuentes (nombre, area, tipo, ruta_origen, hojas, campos, filas_detectadas, uso_operativo)
values
  ('1. EVENTOS 2026.xlsx', 'Marketing / Coordinacion', 'eventos', 'C:\Users\User\Downloads\DRIVE\1. EVENTOS 2026.xlsx', array['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO'], array['codigo','ficha','grupo_whatsapp','zoom','evento','modalidad','fecha','horario','creditos'], 7899, 'Base historica de eventos por codigo, modalidad, fechas, links y responsables.'),
  ('Direccional de Campanas con UTMs l Rebagliati Diplomados.xlsx', 'Marketing', 'utms', 'C:\Users\User\Downloads\DRIVE\Direccional de Campañas con UTMs l Rebagliati Diplomados.xlsx', array['FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO'], array['codigo','grado_academico','tipo_evento','modalidad','utm_campana','utm_anuncio','celular','grupo_usuario'], 3265, 'Cruce entre campana, celular, publico objetivo y producto vendido.'),
  ('ESTRATEGIAS DE MARKETING 2026.xlsx', 'Marketing', 'estrategias', 'C:\Users\User\Downloads\DRIVE\ESTRATEGIAS DE MARKETING 2026.xlsx', array['BORRADOR EST','CURSOS 2026','DIPLOMADOS 2026','PROMOS ADICIONALES','GRUPOS DE WSP'], array['codigo','evento','modalidad','fecha_inicio','estrategia','avance','walink','inscritos'], 4247, 'Mide estrategias, promociones, grupos WhatsApp, avance inicial y progreso por evento.'),
  ('RANKING DE VENTAS - AREA DE MARKETING.xlsx', 'Ventas', 'ranking', 'C:\Users\User\Downloads\DRIVE\RANKING DE VENTAS - ÁREA DE MARKETING (1).xlsx', array['RANKING DE VENTAS 2026','REGISTRO DIARIO 2026','DISTRIBUCION DE GRUPOS','DASHBOARD EJECUTIVOS 2026'], array['fecha','ejecutivo','C','CM','D','grupo_wsp','llamadas','repaso','recopilados','avance'], 4008, 'Ranking por C/CM/D, checklist diario, distribucion de grupos y alertas por ejecutivo.'),
  ('SEGUIMIENTO DE LLAMADAS 2026.xlsx', 'Ventas', 'llamadas', 'C:\Users\User\Downloads\DRIVE\SEGUIMIENTO DE LLAMADAS 2026.xlsx', array['ENERO 2026','MAYO 2026','JUNIO 2026','JULIO 2026','INCIDENCIAS EJECUTIVOS 2026'], array['numero','kommo','ejecutivo','evento','codigo','preinscritos','inscritos','incidencia'], 5306, 'Seguimiento de llamadas, bases asignadas, preinscritos, inscritos e incidencias.'),
  ('PLANTILLA DE AUTOMATIZACION.md', 'Ventas / Marketing', 'plantillas', 'C:\Users\User\Downloads\DRIVE\PLANTILLA DE AUTOMATIZACIÓN.md', array['JUNIO','DIPLOMADOS','CURSOS'], array['codigo','certificacion','link_inscripcion','fecha_inicio','duracion','modalidad','publico'], 59642, 'Versionado de mensajes automatizados por producto y etapa comercial.'),
  ('PLANTILLAS INFORMATIVAS- EVENTOS.md', 'Caja / Ventas', 'pagos', 'C:\Users\User\Downloads\DRIVE\PLANTILLAS INFORMATIVAS- EVENTOS .md', array['cuentas','correos','celulares','eventos'], array['tipo_programa','cuenta','titular','yape','plin','correo_area','voucher'], 322157, 'Validacion de pagos, cuentas oficiales, correos por area y regla de voucher.')
on conflict (nombre) do update set
  area = excluded.area,
  tipo = excluded.tipo,
  ruta_origen = excluded.ruta_origen,
  hojas = excluded.hojas,
  campos = excluded.campos,
  filas_detectadas = excluded.filas_detectadas,
  uso_operativo = excluded.uso_operativo,
  updated_at = now();

insert into public.caja_controles_pago_drive (tipo_programa, regla, severidad, requiere_voucher, bloquea_comision)
values
  ('Todos', 'Usar cuentas oficiales segun tipo de programa: diplomados profesionales, diplomados tecnicos o cursos/congresos.', 'alta', true, true),
  ('Todos', 'Sin voucher legible no debe cerrarse la inscripcion.', 'critica', true, true),
  ('Todos', 'Pago en cuenta incorrecta queda en validacion y no se liquida comision hasta confirmacion de caja.', 'critica', true, true),
  ('Todos', 'Caja debe enviar pagos observados a ventas y finanzas con motivo, titular y programa.', 'media', true, false)
on conflict do nothing;
