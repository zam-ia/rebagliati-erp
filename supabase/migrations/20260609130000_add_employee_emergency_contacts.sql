-- Agrega contactos de emergencia usados por RR.HH. > Base de datos.

alter table if exists public.empleados
  add column if not exists contacto1_parentesco text,
  add column if not exists contacto1_telefono text,
  add column if not exists contacto2_parentesco text,
  add column if not exists contacto2_telefono text;

comment on column public.empleados.contacto1_parentesco is 'Parentesco del contacto de emergencia principal.';
comment on column public.empleados.contacto1_telefono is 'Telefono del contacto de emergencia principal.';
comment on column public.empleados.contacto2_parentesco is 'Parentesco del contacto de emergencia secundario.';
comment on column public.empleados.contacto2_telefono is 'Telefono del contacto de emergencia secundario.';

notify pgrst, 'reload schema';
