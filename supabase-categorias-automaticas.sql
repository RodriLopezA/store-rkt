alter table public.productos
add column if not exists categorias_busqueda jsonb default '[]'::jsonb;

update public.productos
set categorias_busqueda = to_jsonb(array[categoria])
where categorias_busqueda is null
   or categorias_busqueda = '[]'::jsonb;
