-- SALUZ · schema v1 (execute SOMENTE no projeto Supabase da SALUZ)
-- NÃO execute no banco do VIDE APP.
create extension if not exists pgcrypto;

create table if not exists public.saluz_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.saluz_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 140),
  description text not null default '',
  category text not null default '',
  image_url text not null default '',
  price_cents integer not null check (price_cents >= 0),
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saluz_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text not null,
  postal_code text not null,
  address_line text not null,
  address_number text not null,
  address_extra text not null default '',
  neighborhood text not null,
  city text not null,
  state text not null,
  items jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer,
  payment_method text not null default 'a_definir',
  status text not null default 'solicitacao_recebida'
    check (status in ('solicitacao_recebida','contatado','aguardando_pagamento','pago_confirmado','em_preparacao','enviado','cancelado')),
  privacy_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saluz_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_type text not null
    check (event_type in ('page_view','product_view','add_to_cart','checkout_start','checkout_submit','contact_click')),
  page_path text not null default '/',
  event_label text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists saluz_events_created_at on public.saluz_events(created_at desc);
create index if not exists saluz_events_session_created on public.saluz_events(session_id, created_at desc);
create index if not exists saluz_orders_created_at on public.saluz_orders(created_at desc);

-- Política conservadora: nenhuma tabela exposta aos visitantes diretamente.
alter table public.saluz_admins enable row level security;
alter table public.saluz_products enable row level security;
alter table public.saluz_orders enable row level security;
alter table public.saluz_events enable row level security;
revoke all on public.saluz_admins, public.saluz_products, public.saluz_orders, public.saluz_events from anon, authenticated;
revoke all on sequence public.saluz_events_id_seq from anon, authenticated;

-- Apenas Workers autenticados e autorizados usam service_role.
-- Cadastrar administradora somente após criar usuário em Auth > Users:
-- insert into public.saluz_admins (user_id) values ('UUID-DA-ADMINISTRADORA');

comment on table public.saluz_orders is
  'Dados pessoais restritos à administração SALUZ; não criar policies públicas. Pedidos não representam pagamento.';

-- A hospedagem antiga GitHub Pages NÃO executa Pages Functions.
-- CHECKOUT_ENABLED deve ficar false até: domínio, termos/privacidade, backups e testes seguros.
