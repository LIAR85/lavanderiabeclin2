'use client'

import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
  PackageCheck,
} from 'lucide-react'
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { SERVICE_LABELS } from '@/lib/config'
import { formatCurrency, hoursSince, isOverdue } from '@/lib/format'
import { useOrders } from '@/lib/hooks'
import type { ServiceType } from '@/lib/types'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function AdminMetrics() {
  const { data: orders } = useOrders()

  const m = useMemo(() => {
    const list = orders ?? []
    const today0 = startOfToday()
    let revenueToday = 0
    let revenueTotal = 0
    let deliveredToday = 0
    let active = 0
    let overdue = 0
    const byService: Record<string, { count: number; revenue: number }> = {}

    for (const o of list) {
      const charged = o.charged_total ?? o.total
      if (o.payment_status === 'paid') revenueTotal += charged
      if (o.status === 'delivered') {
        if (new Date(o.updated_at).getTime() >= today0) {
          deliveredToday++
          if (o.payment_status === 'paid') revenueToday += charged
        }
      } else {
        active++
        if (isOverdue(o.promised_date)) overdue++
      }
      const s = byService[o.service_type] ?? { count: 0, revenue: 0 }
      s.count++
      s.revenue += charged
      byService[o.service_type] = s
    }

    // avg turnaround for delivered orders (hours)
    const delivered = list.filter((o) => o.status === 'delivered')
    const avgTurnaround =
      delivered.length > 0
        ? delivered.reduce(
            (acc, o) =>
              acc + hoursSince(o.created_at) - hoursSince(o.updated_at),
            0,
          ) / delivered.length
        : 0

    const serviceRows = Object.entries(byService)
      .map(([k, v]) => ({ service: k as ServiceType, ...v }))
      .sort((a, b) => b.revenue - a.revenue)

    return {
      revenueToday,
      revenueTotal,
      deliveredToday,
      active,
      overdue,
      avgTurnaround,
      serviceRows,
      totalOrders: list.length,
    }
  }, [orders])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={CircleDollarSign}
          label="Ingresos hoy"
          value={formatCurrency(m.revenueToday)}
          accent="primary"
        />
        <Kpi
          icon={PackageCheck}
          label="Entregadas hoy"
          value={String(m.deliveredToday)}
          accent="success"
        />
        <Kpi
          icon={Clock}
          label="Órdenes activas"
          value={String(m.active)}
          accent="sky"
        />
        <Kpi
          icon={AlertTriangle}
          label="Vencidas"
          value={String(m.overdue)}
          accent={m.overdue > 0 ? 'destructive' : 'muted'}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Ingresos acumulados (cobrados)
            </span>
            <span className="font-display text-2xl font-900 text-primary">
              {formatCurrency(m.revenueTotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Órdenes totales</span>
            <span className="font-700">{m.totalOrders}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Tiempo medio de proceso
            </span>
            <span className="font-700">
              {m.avgTurnaround > 0 ? `${Math.round(m.avgTurnaround)} h` : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <span className="font-display text-base font-800">
            Ingresos por servicio
          </span>
          {m.serviceRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay datos.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {m.serviceRows.map((row) => {
                const max = m.serviceRows[0].revenue || 1
                const pct = Math.round((row.revenue / max) * 100)
                return (
                  <div key={row.service} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-600">
                        {SERVICE_LABELS[row.service]}{' '}
                        <span className="text-muted-foreground">
                          ({row.count})
                        </span>
                      </span>
                      <span className="font-700">
                        {formatCurrency(row.revenue)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock
  label: string
  value: string
  accent: 'primary' | 'success' | 'sky' | 'destructive' | 'muted'
}) {
  const accentClasses: Record<string, string> = {
    primary: 'text-primary bg-secondary',
    success: 'text-success bg-success/10',
    sky: 'text-brand-sky-foreground bg-brand-sky/40',
    destructive: 'text-destructive bg-destructive/10',
    muted: 'text-muted-foreground bg-muted',
  }
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div
          className={`flex size-9 items-center justify-center rounded-lg ${accentClasses[accent]}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-2xl font-900 leading-none">
            {value}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}
