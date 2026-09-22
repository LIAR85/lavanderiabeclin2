'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as svc from './services'
import type { OrderStatus, OrderWithClient } from './types'

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: svc.listOrders,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  })
}

export function useOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => svc.getOrderItems(orderId!),
    enabled: !!orderId,
  })
}

export function useOrderHistory(orderId: string | null) {
  return useQuery({
    queryKey: ['order-history', orderId],
    queryFn: () => svc.getOrderHistory(orderId!),
    enabled: !!orderId,
  })
}

export function useAdvanceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { orderId: string; nextStatus: OrderStatus; note?: string }) =>
      svc.advanceOrderStatus(p),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order-history', v.orderId] })
    },
  })
}

export function useCollectAndDeliver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: svc.collectAndDeliver,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useDeliverByFolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (folio: string) => svc.deliverByFolio(folio),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export type { OrderWithClient }
