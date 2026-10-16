import type {
  BagSize,
  OrderStatus,
  ServiceMode,
  ServiceType,
  VisibleStatus,
} from './types'

export const SERVICE_LABELS: Record<ServiceType, string> = {
  lavado: 'Lavado',
  lavado_secado: 'Lavado/secado',
  lavado_planchado: 'Lavado + Planchado',
  edredones: 'Edredones',
  ropa_cama: 'Ropa de cama',
  tintoreria: 'Tintorería',
  tenis: 'Tenis',
  planchado: 'Planchado',
  secado: 'Secado',
  otro: 'Otro',
}

export const SERVICE_ORDER: ServiceType[] = [
  'lavado',
  'lavado_secado',
  'lavado_planchado',
  'edredones',
  'ropa_cama',
  'tintoreria',
  'tenis',
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

export type AmountUnit = 'bolsa' | 'par' | 'pieza'

/** Unit in which each service is quantified at reception. */
export const SERVICE_UNIT: Record<ServiceType, AmountUnit> = {
  lavado: 'bolsa',
  lavado_secado: 'bolsa',
  lavado_planchado: 'bolsa',
  edredones: 'pieza',
  ropa_cama: 'pieza',
  tintoreria: 'pieza',
  tenis: 'par',
  planchado: 'pieza',
  secado: 'bolsa',
  otro: 'pieza',
}

export const UNIT_LABELS: Record<
  AmountUnit,
  { singular: string; plural: string; title: string }
> = {
  bolsa: { singular: 'bolsa', plural: 'bolsas', title: 'Bolsas' },
  par: { singular: 'par', plural: 'pares', title: 'Pares' },
  pieza: { singular: 'pieza', plural: 'piezas', title: 'Piezas' },
}

/** Human readable amount, e.g. "1/2 bolsa", "3 bolsas", "2 pares". */
export function formatAmount(
  serviceType: ServiceType,
  bagSize: BagSize | null | undefined,
  quantity: number | null | undefined,
): string {
  const unit = UNIT_LABELS[SERVICE_UNIT[serviceType] ?? 'pieza']
  const qty = quantity && quantity > 0 ? quantity : 1
  if (
    SERVICE_UNIT[serviceType] === 'bolsa' &&
    bagSize &&
    bagSize !== 'full' &&
    bagSize !== 'custom'
  ) {
    return qty === 1 ? BAG_LABELS[bagSize] : `${qty} × ${BAG_LABELS[bagSize]}`
  }
  return `${qty} ${qty === 1 ? unit.singular : unit.plural}`
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
  lavado_secado: ['received', 'washing', 'drying', 'packing', 'ready', 'delivered'],
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
  ropa_cama: ['received', 'washing', 'drying', 'packing', 'ready', 'delivered'],
  tintoreria: ['received', 'washing', 'ironing', 'packing', 'ready', 'delivered'],
  tenis: ['received', 'washing', 'drying', 'packing', 'ready', 'delivered'],
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
  /** Overrides for SERVICE_VARIANTS prices, keyed `${service}:${variantKey}`. */
  variantPrices: Record<string, number>
}

export const DEFAULT_SETTINGS: PricingSettings = {
  basePrices: {
    lavado: 120,
    lavado_secado: 150,
    lavado_planchado: 180,
    edredones: 150,
    ropa_cama: 80,
    tintoreria: 90,
    tenis: 120,
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
  variantPrices: {},
}

export interface ServiceVariant {
  key: string
  label: string
  price: number
  promo?: boolean
  /** Section heading used to organise long lists. */
  group?: string
  /** Bag equivalent of one unit (e.g. 0.5 for half a bag). */
  bagFactor?: number
  /** Optional extra (hanger, Lysol…): priced but not counted as a piece. */
  addon?: boolean
  /** Name stored on the order line when the label alone is ambiguous. */
  fullLabel?: string
}

function inGroup(group: string, items: ServiceVariant[]): ServiceVariant[] {
  return items.map((v) => ({ ...v, group, fullLabel: v.fullLabel ?? `${group} · ${v.label}` }))
}


/** Services quantified piece by piece, each size/garment with its own price. */
export const SERVICE_VARIANTS: Partial<Record<ServiceType, ServiceVariant[]>> = {
  lavado_secado: [
    { key: 'media', label: 'Media bolsa', price: 80, bagFactor: 0.5 },
    { key: 'bolsa', label: 'Bolsa', price: 150, bagFactor: 1 },
  ],
  edredones: [
    { key: 'individual', label: 'Individual', price: 120, group: 'Tamaño' },
    { key: 'matrimonial', label: 'Matrimonial', price: 150, group: 'Tamaño' },
    { key: 'queen', label: 'Queen', price: 170, group: 'Tamaño' },
    { key: 'king', label: 'King', price: 190, group: 'Tamaño' },
    { key: 'promo_lunes', label: 'Promo de lunes', price: 130, promo: true, group: 'Tamaño' },
    {
      key: 'lysol',
      label: 'Lavado con Lysol',
      fullLabel: 'Extra: lavado con Lysol',
      price: 40,
      addon: true,
      group: 'Extras de lavado (opcional)',
    },
    {
      key: 'extra_suavitel',
      label: 'Extra Suavitel',
      fullLabel: 'Extra: Suavitel',
      price: 30,
      addon: true,
      group: 'Extras de lavado (opcional)',
    },
  ],
  ropa_cama: [
    ...inGroup('Sábanas', [
      { key: 'sabana_ind', label: 'Individual', price: 70 },
      { key: 'sabana_mat', label: 'Matrimonial', price: 90 },
      { key: 'sabana_queen', label: 'Queen', price: 110 },
      { key: 'sabana_king', label: 'King', price: 130 },
    ]),
    ...inGroup('Fundas', [
      { key: 'funda_grande', label: 'Grandes', price: 40 },
      { key: 'funda_chica', label: 'Chicas', price: 30 },
    ]),
    ...inGroup('Frazadas ligeras', [
      { key: 'frazada_chica', label: 'Chica', price: 100 },
      { key: 'frazada_grande', label: 'Grande', price: 140 },
    ]),
    ...inGroup('Toallas', [
      { key: 'toalla_chica', label: 'Chica', price: 30 },
      { key: 'toalla_mediana', label: 'Mediana', price: 45 },
      { key: 'toalla_grande', label: 'Grande', price: 70 },
    ]),
  ],
  planchado: [
    ...inGroup('Plancha por prenda', [
      { key: 'prenda_con', label: 'Con gancho', price: 25 },
      { key: 'prenda_sin', label: 'Sin gancho', price: 20 },
    ]),
    ...inGroup('Planchado por docena', [
      { key: 'docena_con', label: 'Con gancho', price: 250 },
      { key: 'docena_sin', label: 'Sin gancho', price: 220 },
    ]),
    ...inGroup('Planchado urgente', [
      { key: 'urgente_con', label: 'Con gancho', price: 40 },
      { key: 'urgente_sin', label: 'Sin gancho', price: 35 },
    ]),
    ...inGroup('Lavado y planchado', [
      { key: 'lavplan_con', label: 'Con gancho', price: 60 },
      { key: 'lavplan_sin', label: 'Sin gancho', price: 55 },
    ]),
    {
      key: 'gancho_extra',
      label: 'Gancho extra',
      price: 5,
      addon: true,
      group: 'Extras',
    },
  ],
  tenis: [
    { key: 'negros', label: 'Negros', price: 120 },
    { key: 'blancos', label: 'Blancos', price: 120 },
    { key: 'otros', label: 'Otros', price: 120 },
  ],
  tintoreria: [
    { key: 'basicos', label: 'Camisa, polo, short, pantalón, falda corta', price: 60, group: 'Ropa de diario' },
    { key: 'falda', label: 'Falda', price: 70, group: 'Ropa de diario' },
    { key: 'palazzo', label: 'Palazzo', price: 90, group: 'Ropa de diario' },
    { key: 'corbata', label: 'Corbata', price: 40, group: 'Ropa de diario' },
    { key: 'vestido_corto', label: 'Vestido corto', price: 110, group: 'Vestidos' },
    { key: 'vestido_largo_sencillo', label: 'Vestido largo sencillo', price: 140, group: 'Vestidos' },
    { key: 'vestido_largo_fiesta', label: 'Vestido largo de fiesta', price: 180, group: 'Vestidos' },
    { key: 'vestido_xv', label: 'Vestido XV', price: 350, group: 'Vestidos' },
    { key: 'vestido_novia', label: 'Vestido de novia', price: 450, group: 'Vestidos' },
    { key: 'vestido_nina_sencillo', label: 'Vestido niña sencillo', price: 90, group: 'Vestidos de niña' },
    { key: 'vestido_nina_fiesta', label: 'Vestido niña de fiesta', price: 150, group: 'Vestidos de niña' },
    { key: 'saco_mujer', label: 'Saco mujer', price: 100, group: 'Sacos y trajes' },
    { key: 'saco_hombre', label: 'Saco hombre', price: 100, group: 'Sacos y trajes' },
    { key: 'traje_completo', label: 'Traje completo (saco y pantalón)', price: 180, group: 'Sacos y trajes' },
    { key: 'chamarra', label: 'Chamarra', price: 150, group: 'Abrigos' },
    { key: 'abrigo_sencillo', label: 'Abrigo sencillo', price: 160, group: 'Abrigos' },
    { key: 'abrigo_largo', label: 'Abrigo largo', price: 200, group: 'Abrigos' },
  ],
}

export function variantPrice(
  settings: PricingSettings,
  service: ServiceType,
  variant: ServiceVariant,
): number {
  return settings.variantPrices?.[`${service}:${variant.key}`] ?? variant.price
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
