-- Modulo de ventas integrado al ERP Rebagliati.
-- Postgres/Supabase version del prototipo de ranking comercial.

create table if not exists public.ventas_periodos (
  id bigserial primary key,
  year smallint not null,
  month smallint not null check (month between 1 and 12),
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, month)
);

create table if not exists public.ventas_equipos (
  id bigserial primary key,
  name text not null unique,
  shift text not null default 'mixto' check (shift in ('manana', 'tarde', 'mixto')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.ventas_ejecutivos (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  team_id bigint references public.ventas_equipos(id) on delete set null,
  full_name text not null,
  short_name text not null,
  phone text,
  turno text not null default 'mixto' check (turno in ('manana', 'tarde', 'mixto')),
  role_type text not null default 'full_time',
  status text not null default 'active' check (status in ('active', 'inactive', 'vacation')),
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_eventos (
  id bigserial primary key,
  name text not null,
  event_type text not null default 'campana',
  career text,
  specialty text,
  start_date date,
  modality text default 'virtual',
  status text not null default 'planned' check (status in ('planned', 'active', 'finished', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.ventas_registros (
  id bigserial primary key,
  period_id bigint references public.ventas_periodos(id) on delete restrict,
  executive_id bigint not null references public.ventas_ejecutivos(id) on delete restrict,
  event_id bigint references public.ventas_eventos(id) on delete set null,
  sale_date date not null,
  category text not null check (category in ('C', 'CM', 'D')),
  quantity integer not null default 0 check (quantity >= 0),
  source text,
  observation text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (executive_id, sale_date, category, event_id)
);

create table if not exists public.ventas_metas (
  id bigserial primary key,
  period_id bigint references public.ventas_periodos(id) on delete cascade,
  executive_id bigint not null references public.ventas_ejecutivos(id) on delete cascade,
  target_total integer not null default 0 check (target_total >= 0),
  target_c integer not null default 0 check (target_c >= 0),
  target_cm integer not null default 0 check (target_cm >= 0),
  target_d integer not null default 0 check (target_d >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, executive_id)
);

create table if not exists public.ventas_checklists (
  id bigserial primary key,
  checklist_date date not null,
  executive_id bigint not null references public.ventas_ejecutivos(id) on delete cascade,
  completion_rate numeric(5,2) not null default 0 check (completion_rate between 0 and 100),
  status text not null default 'critico' check (status in ('completo', 'en_proceso', 'critico')),
  observation text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_date, executive_id)
);

create table if not exists public.ventas_grupos_whatsapp (
  id bigserial primary key,
  name text not null,
  link text,
  members_count integer not null default 0 check (members_count >= 0),
  status text not null default 'pendiente' check (status in ('en_uso', 'sin_usar', 'archivado', 'pendiente')),
  career text,
  specialty text,
  executive_name text,
  opportunity_score numeric(5,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventas_alertas (
  id bigserial primary key,
  alert_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  executive_id bigint references public.ventas_ejecutivos(id) on delete set null,
  period_id bigint references public.ventas_periodos(id) on delete set null,
  group_id bigint references public.ventas_grupos_whatsapp(id) on delete set null,
  message text not null,
  payload_json jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ventas_registros_period_date on public.ventas_registros(period_id, sale_date);
create index if not exists idx_ventas_registros_executive_date on public.ventas_registros(executive_id, sale_date);
create index if not exists idx_ventas_registros_category on public.ventas_registros(category);
create index if not exists idx_ventas_checklists_status_date on public.ventas_checklists(status, checklist_date);
create index if not exists idx_ventas_grupos_status on public.ventas_grupos_whatsapp(status);

create or replace view public.vw_ventas_ranking_mensual as
select
  p.year,
  p.month,
  e.id as executive_id,
  e.short_name,
  coalesce(sum(case when r.category = 'C' then r.quantity else 0 end), 0) as total_c,
  coalesce(sum(case when r.category = 'CM' then r.quantity else 0 end), 0) as total_cm,
  coalesce(sum(case when r.category = 'D' then r.quantity else 0 end), 0) as total_d,
  coalesce(sum(r.quantity), 0) as total_sales
from public.ventas_registros r
join public.ventas_periodos p on p.id = r.period_id
join public.ventas_ejecutivos e on e.id = r.executive_id
group by p.year, p.month, e.id, e.short_name;

create or replace view public.vw_ventas_checklist_riesgo as
select
  c.checklist_date,
  e.short_name,
  c.completion_rate,
  c.status,
  case
    when c.completion_rate < 50 then 'Intervencion inmediata'
    when c.completion_rate < 85 then 'Seguimiento del lider'
    else 'Operacion conforme'
  end as recommended_action
from public.ventas_checklists c
join public.ventas_ejecutivos e on e.id = c.executive_id;

create or replace view public.vw_ventas_grupos_oportunidad as
select
  id,
  name,
  members_count,
  status,
  career,
  specialty,
  case
    when status = 'sin_usar' and members_count >= 200 then 'Alta oportunidad'
    when status = 'pendiente' then 'Requiere asignacion'
    when status = 'en_uso' then 'Activo'
    else 'Baja prioridad'
  end as opportunity_label
from public.ventas_grupos_whatsapp;

alter table public.ventas_periodos enable row level security;
alter table public.ventas_equipos enable row level security;
alter table public.ventas_ejecutivos enable row level security;
alter table public.ventas_eventos enable row level security;
alter table public.ventas_registros enable row level security;
alter table public.ventas_metas enable row level security;
alter table public.ventas_checklists enable row level security;
alter table public.ventas_grupos_whatsapp enable row level security;
alter table public.ventas_alertas enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'ventas_periodos',
    'ventas_equipos',
    'ventas_ejecutivos',
    'ventas_eventos',
    'ventas_registros',
    'ventas_metas',
    'ventas_checklists',
    'ventas_grupos_whatsapp',
    'ventas_alertas'
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
        ('ventas_dashboard', 1),
        ('ventas_ranking', 2),
        ('ventas_checklist', 3),
        ('ventas_grupos_whatsapp', 4)
    ) as children(child_name, child_order)
    where not exists (
      select 1 from public.modulos_sistema m where m.nombre = children.child_name
    );
  end if;
end $$;
