alter table public.productos
add column if not exists video_url text,
add column if not exists videos_urls text[] default '{}',
add column if not exists stock_talles jsonb default '{}'::jsonb;
