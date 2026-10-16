-- Actualización de la BD (idempotente: se puede ejecutar más de una vez).
-- Ejecutar completa en Supabase → SQL Editor.
--
-- Servicios nuevos (Lavado/secado, Tenis, Ropa de cama), sus tamaños/prendas y los
-- extras (Lysol, Suavitel, gancho extra) NO requieren columnas nuevas en `orders`:
-- `service_type` y `bag_size` son texto libre y los estatus no cambiaron.
-- Cada línea del servicio se guarda en `order_items`; aquí se agrega `kind` para
-- distinguir servicio / extra del servicio / pieza especial.

-- 1) order_items: tipo de línea y clave de la opción elegida
alter table public.order_items
  add column if not exists kind text not null default 'extra',
  add column if not exists variant_key text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_items_kind_check'
  ) then
    alter table public.order_items
      add constraint order_items_kind_check
      check (kind in ('service', 'addon', 'extra'));
  end if;
end $$;

-- 2) Índices para filtros/orden del tablero de proceso y calendario
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_promised_date_idx on public.orders(promised_date);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_service_type_idx on public.orders(service_type);

-- 3) Tablas del último commit que aún no existen en la BD
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

create index if not exists employee_attendance_employee_id_idx
  on public.employee_attendance(employee_id);

alter table public.employee_profiles enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.delivery_capacity enable row level security;

drop policy if exists "employee_profiles_all_anon" on public.employee_profiles;
create policy "employee_profiles_all_anon" on public.employee_profiles
  for all to anon using (true) with check (true);

drop policy if exists "employee_attendance_all_anon" on public.employee_attendance;
create policy "employee_attendance_all_anon" on public.employee_attendance
  for all to anon using (true) with check (true);

drop policy if exists "delivery_capacity_all_anon" on public.delivery_capacity;
create policy "delivery_capacity_all_anon" on public.delivery_capacity
  for all to anon using (true) with check (true);

notify pgrst, 'reload schema';
