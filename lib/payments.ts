import type { Order } from './types'

export function paidAmount(order: Pick<Order, 'total' | 'charged_total' | 'payment_status'>): number {
  if (order.payment_status === 'paid') {
    return order.charged_total ?? order.total
  }
  if (typeof order.charged_total === 'number' && Number.isFinite(order.charged_total)) {
    return Math.max(0, Math.min(order.total, order.charged_total))
  }
  return 0
}

export function pendingAmount(
  order: Pick<Order, 'total' | 'charged_total' | 'payment_status'>,
): number {
  const remaining = order.total - paidAmount(order)
  return remaining > 0 ? remaining : 0
}

export function hasPartialPayment(
  order: Pick<Order, 'total' | 'charged_total' | 'payment_status'>,
): boolean {
  if (order.payment_status === 'paid') return false
  const paid = paidAmount(order)
  return paid > 0 && pendingAmount(order) > 0
}
