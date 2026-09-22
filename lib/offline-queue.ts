'use client'

import type { NewOrderInput } from './types'

const KEY = 'beclin:offline_orders'

export interface QueuedOrder {
  id: string
  input: NewOrderInput
  order_number: string
  queued_at: string
}

export function getQueue(): QueuedOrder[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]') as QueuedOrder[]
  } catch {
    return []
  }
}

function setQueue(items: QueuedOrder[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('beclin:queue'))
}

export function enqueueOrder(item: QueuedOrder) {
  const items = getQueue()
  items.push(item)
  setQueue(items)
}

export function removeFromQueue(id: string) {
  setQueue(getQueue().filter((i) => i.id !== id))
}

export function queueSize(): number {
  return getQueue().length
}
