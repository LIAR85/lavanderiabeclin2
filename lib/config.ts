import type {
  BagSize,
  OrderStatus,
  ServiceMode,
  ServiceType,
  VisibleStatus,
} from './types'

export const SERVICE_LABELS: Record<ServiceType, string> = {
  lavado: 'Lavado',
  lavado_planchado: 'Lavado + Planchado',
  edredones: 'Edredones',
  tintoreria: 'Tintorería',
  planchado: 'Planchado',
  secado: 'Secado',
  otro: 'Otro',
}

export const SERVICE_ORDER: ServiceType[] = [
  'lavado',
  'lavado_planchado',
  'edredones',
  'tintoreria',
  'planchado',
  'secado',
  'otro',
]

export const MODE_LABELS: Record<ServiceMode, string> = {
  regular: 'Regular',
  express: 'Express',
}

export const BAG_LABELS: Record<BagSize, string> = {
  quarter: '1/4 bolsa',
  half: '1/2 bolsa',
  threequarter: '3/4 bolsa',
  full: '1 bolsa',
  custom: 'Personalizada',
}

export const STATUS_TO_VISIBLE: Record<OrderStatus, VisibleStatus> = {
  received: 'RECIBIDA',
  washing: 'EN LAVADO',
  drying: 'EN SECADO',
  ironing: 'EN PLANCHADO',
  packing: 'EMPACANDO',
  ready: 'LISTA',
  delivered: 'ENTREGADA',
}

export const VISIBLE_TO_STATUS: Record<VisibleStatus, OrderStatus> = {
  RECIBIDA: 'received',
  'EN LAVADO': 'washing',
  'EN SECADO': 'drying',
  'EN PLANCHADO': 'ironing',
  EMPACANDO: 'packing',
  LISTA: 'ready',
  ENTREGADA: 'delivered',
}

/** Dynamic flow of statuses per service type. */
export const SERVICE_FLOWS: Record<ServiceType, OrderStatus[]> = {
  lavado: ['received', 'washing', 'drying', 'packing', 'ready', 'delivered'],
  lavado_planchado: [
    'received',
    'washing',
    'drying',
    'ironing',
    'packing',
    'ready',
    'delivered',
  ],
  edredones: ['received', 'washing', 'drying', 'packing', 'ready', 'delivered'],
  tintoreria: ['received', 'washing', 'ironing', 'packing', 'ready', 'delivered'],
  planchado: ['received', 'ironing', 'packing', 'ready', 'delivered'],
  secado: ['received', 'drying', 'packing', 'ready', 'delivered'],
  otro: ['received', 'washing', 'packing', 'ready', 'delivered'],
}

export const VISIBLE_STATUS_LABELS: Record<string, string> = {
  RECIBIDA: 'Recibida',
  'EN LAVADO': 'En lavado',
  'EN SECADO': 'En secado',
  'EN PLANCHADO': 'En planchado',
  EMPACANDO: 'Empacando',
  LISTA: 'Lista',
  ENTREGADA: 'Entregada',
}

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline'
  | 'sky'

export const STATUS_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  received: 'sky',
  washing: 'default',
  drying: 'default',
  ironing: 'default',
  packing: 'secondary',
  ready: 'success',
  delivered: 'outline',
}

export const STATUS_ORDER: OrderStatus[] = [
  'received',
  'washing',
  'drying',
  'ironing',
  'packing',
  'ready',
  'delivered',
]

/** Next status in the service-specific flow, or null when final. */
export function getNextStatus(
  serviceType: ServiceType,
  current: OrderStatus,
): OrderStatus | null {
  const flow = SERVICE_FLOWS[serviceType] ?? SERVICE_FLOWS.otro
  const idx = flow.indexOf(current)
  if (idx === -1 || idx >= flow.length - 1) return null
  return flow[idx + 1]
}

export const STATUS_FILTERS: { value: 'ALL' | VisibleStatus; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'EN LAVADO', label: 'En lavado' },
  { value: 'EN SECADO', label: 'En secado' },
  { value: 'EN PLANCHADO', label: 'En planchado' },
  { value: 'EMPACANDO', label: 'Empacando' },
  { value: 'LISTA', label: 'Lista' },
  { value: 'ENTREGADA', label: 'Entregada' },
]

export interface PricingSettings {
  basePrices: Record<ServiceType, number>
  bagFactors: Record<Exclude<BagSize, 'custom'>, number>
  expressMultiplier: number
  promisedDaysRegular: number
  promisedDaysExpress: number
}

export const DEFAULT_SETTINGS: PricingSettings = {
  basePrices: {
    lavado: 120,
    lavado_planchado: 180,
    edredones: 150,
    tintoreria: 90,
    planchado: 100,
    secado: 70,
    otro: 100,
  },
  bagFactors: {
    quarter: 0.25,
    half: 0.5,
    threequarter: 0.75,
    full: 1,
  },
  expressMultiplier: 1.5,
  promisedDaysRegular: 2,
  promisedDaysExpress: 1,
}

export const SPECIAL_ITEMS_CATALOG: { name: string; price: number }[] = [
  { name: 'Edredón', price: 120 },
  { name: 'Cobija', price: 90 },
  { name: 'Almohada', price: 60 },
  { name: 'Cortina', price: 110 },
  { name: 'Tapete', price: 130 },
  { name: 'Traje', price: 140 },
  { name: 'Vestido', price: 120 },
  { name: 'Chamarra', price: 100 },
]

export const INSTRUCTION_PRESETS: string[] = [
  'Separar por color',
  'Agua fría',
  'Sin suavizante',
  'Cuidado delicado',
  'Colgar camisas',
  'Doblado especial',
  'Planchar sin almidón',
  'No usar cloro',
]

export const INVENTORY_PRESETS: { name: string; unit: string }[] = [
  { name: 'Detergente', unit: 'L' },
  { name: 'Suavizante', unit: 'L' },
  { name: 'Cloro', unit: 'L' },
  { name: 'Bolsas', unit: 'pza' },
  { name: 'Ganchos', unit: 'pza' },
  { name: 'Desengrasante', unit: 'L' },
]

/** Master password for the admin area (operational gate, not per-user auth). */
export const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'Davidyana2026##'

export const EMPLOYEE_ROLES = [
  'Operador de mostrador',
  'Lavado',
  'Planchado',
  'Repartidor',
  'Gerente',
]

export const EXPENSE_CATEGORIES = [
  'Renta',
  'Servicios (luz/agua/gas)',
  'Insumos',
  'Nómina',
  'Mantenimiento',
  'Transporte',
  'Otro',
]

export const BUSINESS = {
  name: 'beClin',
  slogan: 'Expertos Lavando',
}
