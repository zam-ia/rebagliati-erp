create table if not exists public.ventas_formularios_google (
  id bigserial primary key,
  nombre text not null,
  evento_codigo text,
  evento_nombre text,
  form_url text,
  sheet_url text,
  sheet_gid text,
  canal_default text not null default 'Google Forms',
  origen_default text not null default 'FORMULARIO',
  asignacion_modo text not null default 'manual' check (asignacion_modo in ('manual', 'round_robin', 'por_turno')),
  webhook_secret text,
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'error', 'archivado')),
  ultima_sincronizacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_leads (
  id bigserial primary key,
  fuente_id bigint references public.ventas_formularios_google(id) on delete set null,
  external_id text not null,
  evento_codigo text,
  evento_nombre text,
  marca_temporal timestamptz,
  nombre text,
  telefono text,
  documento text,
  correo text,
  profesion text,
  departamento text,
  provincia text,
  institucion text,
  canal text,
  origen text,
  fase text not null default 'LEAD NUEVO',
  observacion text,
  cierre text not null default 'ACTIVO',
  fecha_contacto date,
  comentario_1 text,
  comentario_2 text,
  ejecutivo_id bigint references public.ventas_ejecutivos(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fuente_id, external_id)
);

create index if not exists idx_ventas_formularios_google_estado on public.ventas_formularios_google(estado);
create index if not exists idx_ventas_leads_fuente on public.ventas_leads(fuente_id);
create index if not exists idx_ventas_leads_estado on public.ventas_leads(fase, cierre);
create index if not exists idx_ventas_leads_evento on public.ventas_leads(evento_codigo);
create index if not exists idx_ventas_leads_contacto on public.ventas_leads(fecha_contacto);

alter table public.ventas_formularios_google enable row level security;
alter table public.ventas_leads enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'ventas_formularios_google',
    'ventas_leads'
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
|