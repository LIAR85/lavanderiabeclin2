-- Esquema requerido por lib/services.ts. Ejecutar una sola vez en Supabase SQL Editor.
create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_type text not null,
  service_mode text not null,
  bag_size text,
  estimated_piece_count integer,
  estimated_weight numeric,
  quantity integer not null default 1,
  promised_date timestamptz,
  subtotal numeric not null default 0,
  extras_total numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'received',
  visible_status text not null default 'RECIBIDA',
  customer_instructions text,
  payment_timing text not null default 'on_delivery',
  payment_status text not null default 'pending',
  charged_total numeric,
  price_overridden boolean not null default false,
  price_override_note text,
  anomaly_tags text[] not null default '{}',
  has_anomalies boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  unit_price numeric not null default 0
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  visible_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists orders_client_id_idx on public.orders(client_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_status_history_order_id_idx on public.order_status_history(order_id);

-- La app usa la clave anon directamente desde el navegador sin auth de Supabase
-- (el acceso se controla con la cookie de /acceso), por lo que se habilita RLS
-- con políticas abiertas para el rol anon.
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

drop policy if exists "clients_all_anon" on public.clients;
create policy "clients_all_anon" on public.clients
  for all to anon using (true) with check (true);

drop policy if exists "orders_all_anon" on public.orders;
create policy "orders_all_anon" on public.orders
  for all to anon using (true) with check (true);

drop policy if exists "order_items_all_anon" on public.order_items;
create policy "order_items_all_anon" on public.order_items
  for all to anon using (true) with check (true);

drop policy if exists "order_status_history_all_anon" on public.order_status_history;
create policy "order_status_history_all_anon" on public.order_status_history
  for all to anon using (true) with check (true);

notify pgrst, 'reload schema';
