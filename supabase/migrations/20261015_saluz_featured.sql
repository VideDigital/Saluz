-- SALUZ: seleção editorial de produtos na Home.
-- Aplicada apenas ao projeto Supabase da SALUZ (São Paulo).
alter table public.saluz_products add column if not exists is_featured boolean not null default false;
create index if not exists saluz_products_public_featured_idx on public.saluz_products (created_at desc) where is_active = true and is_featured = true;
create index if not exists saluz_products_public_new_idx on public.saluz_products (created_at desc) where is_active = true;
