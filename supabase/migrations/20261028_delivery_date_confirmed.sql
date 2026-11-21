alter table public.orders
add column if not exists delivery_date_confirmed boolean not null default true;
