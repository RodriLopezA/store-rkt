alter table public.productos
add column if not exists imagenes_urls text[] default '{}',
add column if not exists colores text;

update public.productos
set imagenes_urls = array[imagen_url]
where imagen_url is not null
  and (imagenes_urls is null or array_length(imagenes_urls, 1) is null);
