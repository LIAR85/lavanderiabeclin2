'use client'

import { AlertTriangle, Loader2, Search, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  STATUS_BADGE_VARIANT,
  STATUS_ORDER,
  VISIBLE_STATUS_LABELS,
} from '@/lib/config'
import {
  formatCurrency,
  formatDateShort,
  formatRelative,
  isOverdue,
} from '@/lib/format'
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

type SortOption =
  | 'oldest'
  | 'newest'
  | 'amount_desc'
  | 'amount_asc'
  | 'client_az'
  | 'client_za'

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48]

function dateKeyFromIso(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ProcessBoard() {
  const { data: orders, isLoading } = useOrders()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('active')
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | 'express' | 'regular'>('all')
  const [createdDateFilter, setCreatedDateFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('oldest')
  const [groupByDate, setGroupByDate] = useState<'off' | 'created'>('off')
  const [pageSize, setPageSize] = useState(12)
  const [page, setPage] = useState(1)
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

    if (modeFilter !== 'all') {
      list = list.filter((o) => o.service_mode === modeFilter)
    }

    if (createdDateFilter) {
      list = list.filter((o) => dateKeyFromIso(o.created_at) === createdDateFilter)
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

    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'amount_desc') {
        return b.total - a.total
      }
      if (sortBy === 'amount_asc') {
        return a.total - b.total
      }
      if (sortBy === 'client_az') {
        return a.client.name.localeCompare(b.client.name, 'es', { sensitivity: 'base' })
      }
      return b.client.name.localeCompare(a.client.name, 'es', { sensitivity: 'base' })
    })

    return sorted
  }, [orders, filter, modeFilter, createdDateFilter, search, sortBy])

  useEffect(() => {
    setPage(1)
  }, [filter, modeFilter, createdDateFilter, search, sortBy, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageItems = filtered.slice(start, start + pageSize)

  const groupedPageItems = useMemo(() => {
    if (groupByDate === 'off') {
      return [{ title: '', items: pageItems }]
    }

    const map = new Map<string, OrderWithClient[]>()
    for (const item of pageItems) {
      const key = dateKeyFromIso(item.created_at)
      const existing = map.get(key) ?? []
      existing.push(item)
      map.set(key, existing)
    }

    return [...map.entries()].map(([key, items]) => ({
      title: formatDateShort(`${key}T00:00:00`),
      items,
    }))
  }, [groupByDate, pageItems])

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

      <Card>
        <CardContent className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scope">Vista</Label>
            <Select
              id="scope"
              value={filter === 'all' ? 'all' : 'active'}
              onChange={(e) => setFilter(e.target.value as 'active' | 'all')}
            >
              <option value="active">Activas (por defecto)</option>
              <option value="all">Todas</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sort">Ordenar por</Label>
            <Select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="oldest">Más antiguas primero</option>
              <option value="newest">Más recientes primero</option>
              <option value="amount_desc">Pago mayor a menor</option>
              <option value="amount_asc">Pago menor a mayor</option>
              <option value="client_az">Cliente A a Z</option>
              <option value="client_za">Cliente Z a A</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mode">Tipo de orden</Label>
            <Select
              id="mode"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as typeof modeFilter)}
            >
              <option value="all">Todas</option>
              <option value="express">Solo express</option>
              <option value="regular">Solo regular</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="created-date">Fecha de creación</Label>
            <Input
              id="created-date"
              type="date"
              value={createdDateFilter}
              onChange={(e) => setCreatedDateFilter(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-date">Dividir por fecha</Label>
            <Select
              id="group-date"
              value={groupByDate}
              onChange={(e) => setGroupByDate(e.target.value as typeof groupByDate)}
            >
              <option value="off">Sin dividir</option>
              <option value="created">Agrupar por día de creación</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-size">Registros por página</Label>
            <Select
              id="page-size"
              value={`${pageSize}`}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

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
        <div className="flex flex-col gap-4">
          {groupedPageItems.map((group) => (
            <div key={group.title || 'all'} className="flex flex-col gap-3">
              {group.title && (
                <div className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-700 text-secondary-foreground">
                  {group.title}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((order) => {
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
            </div>
          ))}

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {filtered.length === 0 ? 0 : start + 1} a {Math.min(start + pageSize, filtered.length)} de {filtered.length} órdenes
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {safePage} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
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
