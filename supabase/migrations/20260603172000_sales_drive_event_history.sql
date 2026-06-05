alter table if exists public.ventas_formularios_google
  alter column canal_default set default 'Google Sheets';

create table if not exists public.ventas_eventos_historico (
  id bigserial primary key,
  evento_codigo text,
  evento_nombre text not null,
  periodo text,
  anio integer,
  mes integer,
  canal text,
  leads integer not null default 0 check (leads >= 0),
  contactados integer not null default 0 check (contactados >= 0),
  ganados integer not null default 0 check (ganados >= 0),
  inscritos integer not null default 0 check (inscritos >= 0),
  perdidos integer not null default 0 check (perdidos >= 0),
  inversion numeric(12,2) not null default 0 check (inversion >= 0),
  ingreso numeric(12,2) not null default 0 check (ingreso >= 0),
  fuente_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ventas_eventos_historico_codigo on public.ventas_eventos_historico(evento_codigo);
create index if not exists idx_ventas_eventos_historico_periodo on public.ventas_eventos_historico(anio, mes);

alter table public.ventas_eventos_historico enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ventas_eventos_historico'
      and policyname = 'ventas_eventos_historico authenticated read'
  ) then
    create policy "ventas_eventos_historico authenticated read"
      on public.ventas_eventos_historico
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ventas_eventos_historico'
      and policyname = 'ventas_eventos_historico authenticated write'
  ) then
    create policy "ventas_eventos_historico authenticated write"
      on public.ventas_eventos_historico
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
