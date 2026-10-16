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
  promised_date timestamptz not null,
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
  unit_price numeric not null default 0,
  -- 'service' = línea del servicio (tamaño/prenda), 'addon' = extra del servicio
  -- (Lysol, Suavitel, gancho extra), 'extra' = pieza especial.
  kind text not null default 'extra' check (kind in ('service', 'addon', 'extra')),
  variant_key text
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  visible_status text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_number text not null unique,
  pin text not null,
  name text not null,
  role text not null,
  phone text,
  schedule_start time,
  schedule_end time,
  hourly_rate numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_profiles(id) on delete cascade,
  event_type text not null check (event_type in ('in', 'out')),
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_capacity (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  ironing_max integer not null default 12,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_client_id_idx on public.orders(client_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_promised_date_idx on public.orders(promised_date);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_service_type_idx on public.orders(service_type);
create index if not exists order_status_history_order_id_idx on public.order_status_history(order_id);
create index if not exists employee_attendance_employee_id_idx on public.employee_attendance(employee_id);

-- La app usa la clave anon directamente desde el navegador sin auth de Supabase
-- (el acceso se controla con la cookie de /acceso), por lo que se habilita RLS
-- con políticas abiertas para el rol anon.
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.delivery_capacity enable row level security;

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

drop policy if exists "employee_profiles_all_anon" on public.employee_profiles;
create policy "employee_profiles_all_anon" on public.employee_profiles
  for all to anon using (true) with check (true);

drop policy if exists "employee_attendance_all_anon" on public.employee_attendance;
create policy "employee_attendance_all_anon" on public.employee_attendance
  for all to anon using (true) with check (true);

drop policy if exists "delivery_capacity_all_anon" on public.delivery_capacity;
create policy "delivery_capacity_all_anon" on public.delivery_capacity
  for all to anon using (true) with check (true);

update public.orders
set promised_date = coalesce(promised_date, created_at)
where promised_date is null;

alter table public.orders
alter column promised_date set not null;

notify pgrst, 'reload schema';
