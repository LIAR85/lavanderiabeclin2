export type ServiceType =
  | 'lavado'
  | 'lavado_planchado'
  | 'edredones'
  | 'tintoreria'
  | 'planchado'
  | 'secado'
  | 'otro'

export type ServiceMode = 'regular' | 'express'

export type BagSize = 'quarter' | 'half' | 'threequarter' | 'full' | 'custom'

export type OrderStatus =
  | 'received'
  | 'washing'
  | 'drying'
  | 'ironing'
  | 'packing'
  | 'ready'
  | 'delivered'

export type VisibleStatus =
  | 'RECIBIDA'
  | 'EN LAVADO'
  | 'EN SECADO'
  | 'EN PLANCHADO'
  | 'EMPACANDO'
  | 'LISTA'
  | 'ENTREGADA'

export type PaymentTiming = 'on_receipt' | 'on_delivery'
export type PaymentStatus = 'pending' | 'paid'

export interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  name: string
  quantity: number
  unit_price: number
}

export interface OrderStatusHistoryEntry {
  id: string
  order_id: string
  status: string
  visible_status: string | null
  note: string | null
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  client_id: string
  service_type: ServiceType
  service_mode: ServiceMode
  bag_size: BagSize | null
  estimated_piece_count: number | null
  estimated_weight: number | null
  quantity: number
  promised_date: string | null
  subtotal: number
  extras_total: number
  total: number
  status: OrderStatus
  visible_status: VisibleStatus
  customer_instructions: string | null
  payment_timing: PaymentTiming
  payment_status: PaymentStatus
  charged_total: number | null
  price_overridden: boolean
  price_override_note: string | null
  anomaly_tags: string[]
  has_anomalies: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderWithClient extends Order {
  client: Client
}

export interface SpecialItemInput {
  name: string
  quantity: number
  unit_price: number
}

export interface NewOrderInput {
  client: { name: string; phone: string; email?: string }
  service_type: ServiceType
  service_mode: ServiceMode
  bag_size: BagSize
  custom_bag_factor?: number
  quantity: number
  estimated_piece_count?: number
  special_items: SpecialItemInput[]
  customer_instructions?: string
  notes?: string
  payment_timing: PaymentTiming
  promised_date: string
  subtotal: number
  extras_total: number
  total: number
}
