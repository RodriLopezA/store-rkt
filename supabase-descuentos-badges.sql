alter table public.productos
add column if not exists nuevo_ingreso boolean default true,
add column if not exists descuento boolean default false,
add column if not exists descuento_porcentaje integer default 0,
add column if not exists precio_anterior numeric;

update public.productos
set
  nuevo_ingreso = coalesce(nuevo_ingreso, true),
  descuento = coalesce(descuento, false),
  descuento_porcentaje = coalesce(descuento_porcentaje, 0);
