import { getDeliveryCapacityConfig } from './local-store'
import type { OrderWithClient, ServiceType } from './types'

const IRONING_RESTRICTED_SERVICES: ServiceType[] = ['planchado', 'lavado_planchado']
type LimitedService = 'planchado' | 'lavado_planchado'

export function dateKeyFromIso(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isIroningRestrictedService(service: ServiceType): boolean {
  return IRONING_RESTRICTED_SERVICES.includes(service)
}

function asLimitedService(service: ServiceType): LimitedService | null {
  if (service === 'planchado') return 'planchado'
  if (service === 'lavado_planchado') return 'lavado_planchado'
  return null
}

export function getIroningPieceLimit(
  dateKey: string,
  service: ServiceType,
): number | null {
  const limitedService = asLimitedService(service)
  if (!limitedService) return null

  const cfg = getDeliveryCapacityConfig()
  const day = cfg.byDate[dateKey] ?? cfg.defaultConfig
  if (day.unlimited[limitedService]) return null
  return day.limits[limitedService]
}

export function getScheduledIroningPieces(
  orders: OrderWithClient[],
  dateKey: string,
  service: ServiceType,
): number {
  return orders.reduce((sum, o) => {
    if (!o.promised_date) return sum
    if (o.status === 'delivered') return sum
    if (o.service_type !== service) return sum
    if (dateKeyFromIso(o.promised_date) !== dateKey) return sum
    const pieces = o.estimated_piece_count ?? 1
    return sum + Math.max(1, pieces)
  }, 0)
}

export function getScheduledIroningPiecesTotal(
  orders: OrderWithClient[],
  dateKey: string,
): number {
  return (
    getScheduledIroningPieces(orders, dateKey, 'planchado') +
    getScheduledIroningPieces(orders, dateKey, 'lavado_planchado')
  )
}

// Backward-compatible wrappers used by existing UI.
export function getIroningDailyCapacity(dateKey: string): number {
  const limit = getIroningPieceLimit(dateKey, 'planchado')
  return limit == null ? Number.MAX_SAFE_INTEGER : limit
}

export function getScheduledIroningCount(orders: OrderWithClient[], dateKey: string): number {
  return orders.filter((o) => {
    if (!o.promised_date) return false
    if (o.status === 'delivered') return false
    return (
      isIroningRestrictedService(o.service_type) &&
      dateKeyFromIso(o.promised_date) === dateKey
    )
  }).length
}
