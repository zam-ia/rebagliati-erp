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
    select 'ventas_pizarra', ventas_id, 12
    where not exists (
      select 1 from public.modulos_sistema where nombre = 'ventas_pizarra'
    );
  end if;
end $$;

do $$
begin
  if to_regclass('public.niveles_acceso_comercial') is not null then
    update public.niveles_acceso_comercial
    set permisos = case
      when not coalesce(permisos, array[]::text[]) @> array['ventas_pizarra']::text[] then coalesce(permisos, array[]::text[]) || array['ventas_pizarra']::text[]
      else permisos
    end
    where codigo in ('supervisor_comercial', 'jefe_ventas', 'gerencia');
  end if;
end $$;
