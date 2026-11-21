'use client'

import { STATUS_TO_VISIBLE } from './config'
import { createClient } from './supabase/client'
import type {
  Client,
  NewOrderInput,
  Order,
  OrderItem,
  PaymentStatus,
  OrderStatus,
  OrderStatusHistoryEntry,
  OrderWithClient,
} from './types'

const supabase = () => createClient()

function isMissingColumnError(error: { code?: string; message?: string }, column?: string): boolean {
  if (!error) return false
  const knownCode = ['PGRST204', '42703'].includes(error.code ?? '')
  if (!knownCode) return false
  if (!column) return true
  return (error.message ?? '').includes(column)
}

function pad4(n: number) {
  return String(n).padStart(4, '0')
}

export function todayFolioPrefix(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `ORD-${yy}${mm}${dd}-`
}

export async function generateOrderNumber(): Promise<string> {
  const prefix = todayFolioPrefix()
  const { count } = await supabase()
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .like('order_number', `${prefix}%`)
  return `${prefix}${pad4((count ?? 0) + 1)}`
}

/** Local fallback folio when offline. */
export function localOrderNumber(): string {
  return `${todayFolioPrefix()}${pad4(Math.floor(Math.random() * 9000) + 1000)}`
}

export async function findClientByPhone(phone: string): Promise<Client | null> {
  const clean = phone.trim()
  if (!clean) return null
  const { data } = await supabase()
    .from('clients')
    .select('*')
    .eq('phone', clean)
    .maybeSingle()
  return (data as Client) ?? null
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase()
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as Client[]
}

async function upsertClient(input: {
  name: string
  phone: string
  email?: string
}): Promise<Client> {
  const name = input.name.trim().toLocaleUpperCase('es-MX')
  const existing = await findClientByPhone(input.phone)
  if (existing) {
    const { data, error } = await supabase()
      .from('clients')
      .update({
        name,
        email: input.email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data as Client
  }
  const { data, error } = await supabase()
    .from('clients')
    .insert({
      name,
      phone: input.phone.trim(),
      email: input.email || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Client
}

export async function createOrder(
  input: NewOrderInput,
  orderNumber?: string,
): Promise<OrderWithClient> {
  const client = await upsertClient(input.client)
  const order_number = orderNumber ?? (await generateOrderNumber())
  const effectivePaymentStatus: PaymentStatus =
    input.payment_status ??
    (input.payment_timing === 'on_receipt' ? 'paid' : 'pending')
  const effectiveChargedTotal =
    typeof input.charged_total === 'number'
      ? input.charged_total
      : effectivePaymentStatus === 'paid'
        ? input.total
        : null
  const hasManualChargeOverride =
    effectivePaymentStatus === 'paid' &&
    typeof effectiveChargedTotal === 'number' &&
    Math.abs(effectiveChargedTotal - input.total) > 0.001

  const insertPayload = {
    order_number,
    client_id: client.id,
    service_type: input.service_type,
    service_mode: input.service_mode,
    bag_size: input.bag_size,
    estimated_piece_count: input.estimated_piece_count ?? null,
    quantity: input.quantity,
    promised_date: input.promised_date,
    subtotal: input.subtotal,
    extras_total: input.extras_total,
    total: input.total,
    status: 'received',
    visible_status: 'RECIBIDA',
    customer_instructions: input.customer_instructions || null,
    payment_timing: input.payment_timing,
    payment_status: effectivePaymentStatus,
    charged_total: effectiveChargedTotal,
    price_overridden: hasManualChargeOverride,
    price_override_note: hasManualChargeOverride
      ? 'Cobro manual capturado al crear la orden'
      : null,
    notes: input.notes || null,
    delivery_date_confirmed: input.delivery_date_confirmed ?? true,
  }

  let { data: order, error } = await supabase()
    .from('orders')
    .insert(insertPayload)
    .select('*')
    .single()
  if (error && isMissingColumnError(error, 'delivery_date_confirmed')) {
    const { delivery_date_confirmed: _legacy, ...legacyPayload } = insertPayload
    ;({ data: order, error } = await supabase()
      .from('orders')
      .insert(legacyPayload)
      .select('*')
      .single())
  }
  if (error) throw error

  const typedOrder = order as Order

  const orderLines = [
    ...(input.service_lines ?? []).map((it) => ({ ...it, kind: it.kind ?? 'service' })),
    ...input.special_items.map((it) => ({ ...it, kind: 'extra' as const })),
  ]
  if (orderLines.length > 0) {
    const rows = orderLines.map((it) => ({
      order_id: typedOrder.id,
      name: it.name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      kind: it.kind,
      variant_key: it.variant_key ?? null,
    }))
    let { error: itemsError } = await supabase().from('order_items').insert(rows)
    // Databases not yet migrated lack kind/variant_key; retry with the legacy columns.
    if (itemsError && ['PGRST204', '42703'].includes(itemsError.code)) {
      ;({ error: itemsError } = await supabase()
        .from('order_items')
        .insert(rows.map(({ kind: _k, variant_key: _v, ...legacy }) => legacy)))
    }
    if (itemsError) throw itemsError
  }

  await supabase().from('order_status_history').insert({
    order_id: typedOrder.id,
    status: 'received',
    visible_status: 'RECIBIDA',
    note: 'Orden creada',
  })

  return { ...typedOrder, client }
}

export async function createLegacyOrder(input: {
  client: { name: string; phone: string; email?: string }
  service_type: Order['service_type']
  service_mode: Order['service_mode']
  quantity: number
  promised_date: string
  subtotal: number
  extras_total: number
  total: number
  paid_amount: number
  status: OrderStatus
  notes?: string
  created_at: string
  delivery_date_confirmed: boolean
}): Promise<OrderWithClient> {
  const normalizedPaidAmount = Math.max(0, Math.min(input.total, input.paid_amount))
  const paymentStatus: PaymentStatus = normalizedPaidAmount >= input.total ? 'paid' : 'pending'
  const visible = STATUS_TO_VISIBLE[input.status]
  const noteParts = [input.notes?.trim()]
  if (normalizedPaidAmount > 0 && paymentStatus === 'pending') {
    noteParts.push(
      `Abono inicial: $${normalizedPaidAmount.toFixed(2)} · Saldo pendiente: $${(input.total - normalizedPaidAmount).toFixed(2)}`,
    )
  }
  const created = await createOrder(
    {
      client: input.client,
      service_type: input.service_type,
      service_mode: input.service_mode,
      bag_size: 'full',
      quantity: Math.max(1, Math.floor(input.quantity)),
      promised_date: input.promised_date,
      subtotal: input.subtotal,
      extras_total: input.extras_total,
      total: input.total,
      payment_timing: normalizedPaidAmount > 0 ? 'on_receipt' : 'on_delivery',
      payment_status: paymentStatus,
      charged_total: normalizedPaidAmount > 0 ? normalizedPaidAmount : undefined,
      special_items: [],
      notes: noteParts.filter(Boolean).join(' · ') || undefined,
      delivery_date_confirmed: input.delivery_date_confirmed,
    },
  )

  const updatePayload = {
    status: input.status,
    visible_status: visible,
    created_at: input.created_at,
    updated_at: input.created_at,
  }
  await supabase().from('orders').update(updatePayload).eq('id', created.id)

  await supabase().from('order_status_history').delete().eq('order_id', created.id)
  await supabase()
    .from('order_status_history')
    .insert({
      order_id: created.id,
      status: input.status,
      visible_status: visible,
      note: 'Orden antigua capturada manualmente',
      created_at: input.created_at,
    })

  return { ...created, ...updatePayload }
}

export async function listOrders(): Promise<OrderWithClient[]> {
  const { data, error } = await supabase()
    .from('orders')
    .select('*, client:clients(*)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return (data ?? []) as OrderWithClient[]
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data } = await supabase()
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
  return (data ?? []) as OrderItem[]
}

export async function getOrderHistory(
  orderId: string,
): Promise<OrderStatusHistoryEntry[]> {
  const { data } = await supabase()
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  return (data ?? []) as OrderStatusHistoryEntry[]
}

export async function advanceOrderStatus(params: {
  orderId: string
  nextStatus: OrderStatus
  note?: string
}): Promise<void> {
  const visible = STATUS_TO_VISIBLE[params.nextStatus]
  const { error } = await supabase()
    .from('orders')
    .update({
      status: params.nextStatus,
      visible_status: visible,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId)
  if (error) throw error

  await supabase().from('order_status_history').insert({
    order_id: params.orderId,
    status: params.nextStatus,
    visible_status: visible,
    note: params.note || null,
  })
}

export async function collectAndDeliver(params: {
  orderId: string
  chargedTotal: number
  originalTotal: number
  overrideNote?: string
}): Promise<void> {
  const priceOverridden =
    Math.abs(params.chargedTotal - params.originalTotal) > 0.001
  const { error } = await supabase()
    .from('orders')
    .update({
      status: 'delivered',
      visible_status: 'ENTREGADA',
      payment_status: 'paid',
      charged_total: params.chargedTotal,
      price_overridden: priceOverridden,
      price_override_note: priceOverridden ? params.overrideNote || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId)
  if (error) throw error

  await supabase()
    .from('order_status_history')
    .insert({
      order_id: params.orderId,
      status: 'delivered',
      visible_status: 'ENTREGADA',
      note: priceOverridden
        ? `Cobro con ajuste: ${params.overrideNote ?? ''}`
        : 'Cobrado y entregado',
    })
}

export async function deliverByFolio(
  folio: string,
): Promise<OrderWithClient | null> {
  const { data } = await supabase()
    .from('orders')
    .select('*, client:clients(*)')
    .eq('order_number', folio.trim())
    .maybeSingle()
  if (!data) return null
  const order = data as OrderWithClient

  await supabase()
    .from('orders')
    .update({
      status: 'delivered',
      visible_status: 'ENTREGADA',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  await supabase().from('order_status_history').insert({
    order_id: order.id,
    status: 'delivered',
    visible_status: 'ENTREGADA',
    note: 'Entregada vía escáner QR',
  })

  return order
}
