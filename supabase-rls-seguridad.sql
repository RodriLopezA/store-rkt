-- Seguridad real para IMPORTADOS RKT
-- Ejecutar una vez en Supabase SQL Editor despues de crear el usuario admin en Supabase Auth.

alter table public.productos enable row level security;

grant select on public.productos to anon, authenticated;
grant insert, update, delete on public.productos to authenticated;

drop policy if exists "productos lectura publica" on public.productos;
drop policy if exists "productos insertar autenticado" on public.productos;
drop policy if exists "productos actualizar autenticado" on public.productos;
drop policy if exists "productos borrar autenticado" on public.productos;

create policy "productos lectura publica"
on public.productos
for select
to anon, authenticated
using (true);

create policy "productos insertar autenticado"
on public.productos
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "productos actualizar autenticado"
on public.productos
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "productos borrar autenticado"
on public.productos
for delete
to authenticated
using (auth.role() = 'authenticated');

-- Storage: bucket publico fotos-ropa.
-- Cualquier cliente puede leer imagenes, pero solo usuarios autenticados pueden subir, editar o borrar.

drop policy if exists "fotos ropa lectura publica" on storage.objects;
drop policy if exists "fotos ropa subir autenticado" on storage.objects;
drop policy if exists "fotos ropa actualizar autenticado" on storage.objects;
drop policy if exists "fotos ropa borrar autenticado" on storage.objects;

create policy "fotos ropa lectura publica"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'fotos-ropa');

create policy "fotos ropa subir autenticado"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fotos-ropa'
  and auth.role() = 'authenticated'
);

create policy "fotos ropa actualizar autenticado"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'fotos-ropa'
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'fotos-ropa'
  and auth.role() = 'authenticated'
);

create policy "fotos ropa borrar autenticado"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fotos-ropa'
  and auth.role() = 'authenticated'
);
