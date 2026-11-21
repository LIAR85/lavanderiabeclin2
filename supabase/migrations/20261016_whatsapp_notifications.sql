-- Registro de notificaciones de WhatsApp para órdenes listas.
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.order_notification_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  notification_event text not null check (notification_event in ('order_ready')),
  channel text not null check (channel in ('whatsapp')),
  recipient_phone text not null,
  recipient_e164 text,
  template_name text not null,
  template_language text not null,
  delivery_status text not null check (
    delivery_status in ('sent', 'failed', 'skipped_duplicate', 'blocked_limit', 'invalid_phone')
  ),
  provider_message_id text,
  provider_error text,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_notification_attempts_order_id_idx
  on public.order_notification_attempts(order_id);

create index if not exists order_notification_attempts_created_at_idx
  on public.order_notification_attempts(created_at desc);

create index if not exists order_notification_attempts_status_idx
  on public.order_notification_attempts(delivery_status);

create unique index if not exists order_notification_attempts_sent_unique_idx
  on public.order_notification_attempts(order_id, notification_event, channel)
  where delivery_status = 'sent';

alter table public.order_notification_attempts enable row level security;

notify pgrst, 'reload schema';
