'use client'

import { STATUS_TO_VISIBLE } from './config'
import { createClient } from './supabase/client'
import type {
  Client,
  NewOrderInput,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  OrderWithClient,
} from './types'

const supabase = () => createClient()

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

async function upsertClient(input: {
  name: string
  phone: string
  email?: string
}): Promise<Client> {
  const existing = await findClientByPhone(input.phone)
  if (existing) {
    const { data, error } = await supabase()
      .from('clients')
      .update({
        name: input.name,
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
      name: input.name,
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
  const hasManualChargeOverride =
    input.payment_timing === 'on_receipt' &&
    typeof input.charged_total === 'number' &&
    Math.abs(input.charged_total - input.total) > 0.001

  const { data: order, error } = await supabase()
    .from('orders')
    .insert({
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
      payment_status: input.payment_timing === 'on_receipt' ? 'paid' : 'pending',
      charged_total:
        input.payment_timing === 'on_receipt'
          ? input.charged_total ?? input.total
          : null,
      price_overridden: hasManualChargeOverride,
      price_override_note: hasManualChargeOverride
        ? 'Cobro manual capturado al crear la orden'
        : null,
      notes: input.notes || null,
    })
    .select('*')
    .single()
  if (error) throw error

  const typedOrder = order as Order

  if (input.special_items.length > 0) {
    const { error: itemsError } = await supabase()
      .from('order_items')
      .insert(
        input.special_items.map((it) => ({
          order_id: typedOrder.id,
          name: it.name,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
      )
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
