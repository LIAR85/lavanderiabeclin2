import { DEFAULT_SETTINGS, type PricingSettings } from './config'
import type { BagSize, ServiceMode, ServiceType, SpecialItemInput } from './types'

export interface PriceBreakdown {
  subtotal: number
  extrasTotal: number
  total: number
}

export function bagFactor(
  settings: PricingSettings,
  bagSize: BagSize,
  customFactor?: number,
): number {
  if (bagSize === 'custom') return customFactor && customFactor > 0 ? customFactor : 1
  return settings.bagFactors[bagSize] ?? 1
}

export function computePrice(params: {
  settings: PricingSettings
  serviceType: ServiceType
  serviceMode: ServiceMode
  bagSize: BagSize
  quantity: number
  customBagFactor?: number
  /** When defined, the subtotal comes from these lines instead of base price. */
  serviceLines?: { unit_price: number; quantity: number }[]
  specialItems: SpecialItemInput[]
}): PriceBreakdown {
  const {
    settings,
    serviceType,
    serviceMode,
    bagSize,
    quantity,
    customBagFactor,
    serviceLines,
    specialItems,
  } = params

  const base = settings.basePrices[serviceType] ?? 0
  const factor = bagFactor(settings, bagSize, customBagFactor)
  const qty = quantity > 0 ? quantity : 1
  const modeMultiplier = serviceMode === 'express' ? settings.expressMultiplier : 1

  const baseSubtotal = serviceLines
    ? serviceLines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0)
    : base * factor * qty
  const subtotal = round2(baseSubtotal * modeMultiplier)
  const extrasTotal = round2(
    specialItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
  )
  const total = round2(subtotal + extrasTotal)

  return { subtotal, extrasTotal, total }
}

export function computePromisedDate(
  settings: PricingSettings,
  mode: ServiceMode,
  from: Date = new Date(),
): Date {
  const days =
    mode === 'express' ? settings.promisedDaysExpress : settings.promisedDaysRegular
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  d.setHours(18, 0, 0, 0)
  return d
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export { DEFAULT_SETTINGS }
