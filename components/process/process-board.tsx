'use client'

import { AlertTriangle, Loader2, Search, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  STATUS_BADGE_VARIANT,
  STATUS_ORDER,
  VISIBLE_STATUS_LABELS,
} from '@/lib/config'
import { formatCurrency, formatRelative, isOverdue } from '@/lib/format'
import { useOrders } from '@/lib/hooks'
import type { OrderStatus, OrderWithClient } from '@/lib/types'
import { cn } from '@/lib/utils'
import { OrderDetailDialog } from './order-detail-dialog'

const FILTERS: { key: OrderStatus | 'all' | 'active'; label: string }[] = [
  { key: 'active', label: 'Activas' },
  { key: 'received', label: 'Recibidas' },
  { key: 'washing', label: 'En proceso' },
  { key: 'ready', label: 'Listas' },
  { key: 'delivered', label: 'Entregadas' },
  { key: 'all', label: 'Todas' },
]

export function ProcessBoard() {
  const { data: orders, isLoading } = useOrders()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('active')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<OrderWithClient | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, active: 0 }
    for (const o of orders ?? []) {
      c.all++
      if (o.status !== 'delivered') c.active++
      c[o.status] = (c[o.status] ?? 0) + 1
    }
    return c
  }, [orders])

  const filtered = useMemo(() => {
    let list = orders ?? []
    if (filter === 'active') {
      list = list.filter((o) => o.status !== 'delivered')
    } else if (filter !== 'all') {
      list = list.filter((o) => o.status === filter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.client.name.toLowerCase().includes(q) ||
          o.client.phone.includes(q),
      )
    }
    return list
  }, [orders, filter, search])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por folio, nombre o teléfono"
          className="pl-9"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-700 transition-colors',
              filter === f.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-foreground',
            )}
          >
            {f.label}
            {counts[f.key] != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs',
                  filter === f.key
                    ? 'bg-primary-foreground/20'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {counts[f.key] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-14 text-center">
            <p className="font-display text-lg font-800">Sin órdenes</p>
            <p className="text-sm text-muted-foreground">
              No hay órdenes que coincidan con este filtro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((order) => {
  const overdue =
    order.status !== 'delivered' && isOverdue(order.promised_date)
            return (
              <button
                key={order.id}
                onClick={() => setSelected(order)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-display text-lg font-900 leading-none">
                      {order.order_number}
                    </span>
                    <span className="mt-1 text-sm font-600">{order.client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.client.phone}
                    </span>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[order.status]}>
                    {VISIBLE_STATUS_LABELS[order.visible_status] ??
                      order.visible_status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {order.service_mode === 'express' && (
                    <Badge variant="warning">
                      <Zap className="size-3" /> Express
                    </Badge>
                  )}
                  {overdue && (
                    <Badge variant="destructive">
                      <AlertTriangle className="size-3" /> Vencida
                    </Badge>
                  )}
                  {order.payment_status === 'paid' && (
                    <Badge variant="success">Pagado</Badge>
                  )}
                </div>

                <div className="flex items-end justify-between border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">
                    {overdue ? 'Venció' : 'Entrega'} {formatRelative(order.promised_date)}
                  </span>
                  <span className="font-display text-base font-800 text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <OrderDetailDialog
        order={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

export { STATUS_ORDER }
