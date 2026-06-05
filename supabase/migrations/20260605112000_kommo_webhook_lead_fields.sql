alter table if exists public.ventas_leads
  add column if not exists kommo_lead_id text,
  add column if not exists kommo_contact_id text,
  add column if not exists kommo_pipeline_id text,
  add column if not exists kommo_status_id text,
  add column if not exists kommo_responsible_user_id text,
  add column if not exists last_activity_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists reassignment_reason text;

create unique index if not exists idx_ventas_leads_kommo_lead_id
  on public.ventas_leads(kommo_lead_id)
  where kommo_lead_id is not null;

create unique index if not exists idx_ventas_leads_external_id
  on public.ventas_leads(external_id);

create index if not exists idx_ventas_leads_last_activity
  on public.ventas_leads(last_activity_at);

create index if not exists idx_ventas_leads_responsible
  on public.ventas_leads(kommo_responsible_user_id);
