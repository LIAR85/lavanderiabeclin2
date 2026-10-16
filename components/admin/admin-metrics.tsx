'use client'

import { AlertTriangle, CircleDollarSign, Clock, Download, FileSpreadsheet, PackageCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SERVICE_LABELS } from '@/lib/config'
import { formatCurrency, hoursSince, isOverdue } from '@/lib/format'
import { useOrders } from '@/lib/hooks'
import { getExpenses, getInventory } from '@/lib/local-store'
import type { ServiceType } from '@/lib/types'

type PeriodMode = 'day' | 'month' | 'year' | 'range'

type ServiceRow = {
  service: ServiceType
  count: number
  revenue: number
}

type DailyRow = {
  date: string
  orders: number
  delivered: number
  revenue: number
}

function toDateKey(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseMonth(input: string): { year: number; month: number } | null {
  const [y, m] = input.split('-').map(Number)
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null
  return { year: y, month: m }
}

function parseDateInput(input: string): Date | null {
  if (!input) return null
  const d = new Date(`${input}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function inSelectedPeriod(params: {
  dateIso: string
  mode: PeriodMode
  day: string
  month: string
  year: string
  rangeStart: string
  rangeEnd: string
}): boolean {
  const d = new Date(params.dateIso)
  if (Number.isNaN(d.getTime())) return false

  switch (params.mode) {
    case 'day':
      return toDateKey(d) === params.day
    case 'month': {
      const m = parseMonth(params.month)
      if (!m) return true
      return d.getFullYear() === m.year && d.getMonth() + 1 === m.month
    }
    case 'year': {
      const y = Number.parseInt(params.year, 10)
      if (!Number.isInteger(y)) return true
      return d.getFullYear() === y
    }
    case 'range': {
      const start = parseDateInput(params.rangeStart)
      const end = parseDateInput(params.rangeEnd)
      if (!start || !end) return true
      const endInclusive = new Date(end)
      endInclusive.setHours(23, 59, 59, 999)
      return d >= start && d <= endInclusive
    }
    default:
      return true
  }
}

function csvEscape(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

function downloadTextFile(fileName: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function todayInput() {
  return toDateKey(new Date()) ?? ''
}

function currentMonthInput() {
  const d = new Date()
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`
}

export function AdminMetrics() {
  const { data: orders } = useOrders()
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const [selectedDay, setSelectedDay] = useState(todayInput())
  const [selectedMonth, setSelectedMonth] = useState(currentMonthInput())
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [rangeStart, setRangeStart] = useState(todayInput())
  const [rangeEnd, setRangeEnd] = useState(todayInput())
  const [localTick, setLocalTick] = useState(0)

  useEffect(() => {
    const onStore = () => setLocalTick((x) => x + 1)
    window.addEventListener('beclin:store', onStore as EventListener)
    return () => window.removeEventListener('beclin:store', onStore as EventListener)
  }, [])

  const metrics = useMemo(() => {
    const list = orders ?? []
    const expenses = getExpenses()
    const inventoryPurchasesTotal = getInventory()
      .flatMap((item) => item.purchases)
      .reduce((sum, p) => sum + (p.price || 0), 0)

    const filtered = list.filter((o) =>
      inSelectedPeriod({
        dateIso: o.created_at,
        mode: periodMode,
        day: selectedDay,
        month: selectedMonth,
        year: selectedYear,
        rangeStart,
        rangeEnd,
      }),
    )

    const deliveredToday = list.filter((o) => {
      if (o.status !== 'delivered') return false
      return toDateKey(o.updated_at) === todayInput()
    }).length

    const active = list.filter((o) => o.status !== 'delivered').length
    const overdue = list.filter((o) => o.status !== 'delivered' && isOverdue(o.promised_date)).length

    let revenue = 0
    let paidRevenue = 0
    let pendingRevenue = 0
    let deliveredCount = 0
    const byServiceMap = new Map<ServiceType, ServiceRow>()
    const dailyMap = new Map<string, DailyRow>()

    for (const o of filtered) {
      const charged = o.charged_total ?? o.total
      revenue += charged
      if (o.payment_status === 'paid') paidRevenue += charged
      else pendingRevenue += charged
      if (o.status === 'delivered') deliveredCount++

      const current = byServiceMap.get(o.service_type) ?? {
        service: o.service_type,
        count: 0,
        revenue: 0,
      }
      current.count += 1
      current.revenue += charged
      byServiceMap.set(o.service_type, current)

      const key = toDateKey(o.created_at) ?? 'sin-fecha'
      const dayRow = dailyMap.get(key) ?? { date: key, orders: 0, delivered: 0, revenue: 0 }
      dayRow.orders += 1
      if (o.status === 'delivered') dayRow.delivered += 1
      dayRow.revenue += charged
      dailyMap.set(key, dayRow)
    }

    const filteredExpenses = expenses.filter((e) =>
      inSelectedPeriod({
        dateIso: e.date,
        mode: periodMode,
        day: selectedDay,
        month: selectedMonth,
        year: selectedYear,
        rangeStart,
        rangeEnd,
      }),
    )
    const expensesTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

    const filteredInventoryPurchases = getInventory()
      .flatMap((item) => item.purchases)
      .filter((p) =>
        inSelectedPeriod({
          dateIso: p.date,
          mode: periodMode,
          day: selectedDay,
          month: selectedMonth,
          year: selectedYear,
          rangeStart,
          rangeEnd,
        }),
      )
      .reduce((sum, p) => sum + (p.price || 0), 0)

    const operationalCosts = expensesTotal + filteredInventoryPurchases
    const net = paidRevenue - operationalCosts

    const serviceRows = Array.from(byServiceMap.values()).sort((a, b) => b.revenue - a.revenue)
    const mostUsed = serviceRows[0] ?? null
    const leastUsed = serviceRows.length > 0 ? [...serviceRows].sort((a, b) => a.count - b.count)[0] : null

    const dailyRows = Array.from(dailyMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1))

    const delivered = filtered.filter((o) => o.status === 'delivered')
    const avgTurnaround =
      delivered.length > 0
        ? delivered.reduce(
            (acc, o) => acc + (hoursSince(o.created_at) - hoursSince(o.updated_at)),
            0,
          ) / delivered.length
        : 0

    return {
      filteredTotal: filtered.length,
      revenue,
      paidRevenue,
      pendingRevenue,
      expensesTotal,
      filteredInventoryPurchases,
      inventoryPurchasesTotal,
      operationalCosts,
      net,
      deliveredCount,
      deliveredToday,
      active,
      overdue,
      avgTurnaround,
      serviceRows,
      dailyRows,
      mostUsed,
      leastUsed,
    }
  }, [
    orders,
    periodMode,
    selectedDay,
    selectedMonth,
    selectedYear,
    rangeStart,
    rangeEnd,
    localTick,
  ])

  function periodLabel() {
    if (periodMode === 'day') return `Día ${selectedDay}`
    if (periodMode === 'month') return `Mes ${selectedMonth}`
    if (periodMode === 'year') return `Año ${selectedYear}`
    return `Rango ${rangeStart} a ${rangeEnd}`
  }

  function exportExcelCsv() {
    const lines: string[] = []
    lines.push('Reporte BeClin')
    lines.push(`Periodo,${csvEscape(periodLabel())}`)
    lines.push(`Ordenes,${metrics.filteredTotal}`)
    lines.push(`Ingresos cobrados,${metrics.paidRevenue.toFixed(2)}`)
    lines.push(`Ingresos pendientes,${metrics.pendingRevenue.toFixed(2)}`)
    lines.push(`Gastos operativos,${metrics.operationalCosts.toFixed(2)}`)
    lines.push(`Utilidad neta,${metrics.net.toFixed(2)}`)
    lines.push('')
    lines.push('Servicios,Ordenes,Ingreso')
    for (const row of metrics.serviceRows) {
      lines.push(
        `${csvEscape(SERVICE_LABELS[row.service])},${row.count},${row.revenue.toFixed(2)}`,
      )
    }
    lines.push('')
    lines.push('Detalle diario,Ordenes,Entregadas,Ingreso')
    for (const row of metrics.dailyRows) {
      lines.push(`${row.date},${row.orders},${row.delivered},${row.revenue.toFixed(2)}`)
    }
    downloadTextFile(
      `reporte-beclin-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join('\n'),
      'text/csv;charset=utf-8',
    )
  }

  async function exportPdfFile() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    })
    let y = 48
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Reporte BeClin', 40, y)
    y += 24

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const lines = [
      `Periodo: ${periodLabel()}`,
      `Órdenes: ${metrics.filteredTotal}`,
      `Ingresos cobrados: ${formatCurrency(metrics.paidRevenue)}`,
      `Ingresos pendientes: ${formatCurrency(metrics.pendingRevenue)}`,
      `Gastos operativos: ${formatCurrency(metrics.operationalCosts)}`,
      `Utilidad neta: ${formatCurrency(metrics.net)}`,
    ]
    for (const line of lines) {
      doc.text(line, 40, y)
      y += 16
    }

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Servicios', 40, y)
    y += 16
    doc.setFont('helvetica', 'normal')
    for (const row of metrics.serviceRows) {
      const rowText = `${SERVICE_LABELS[row.service]} | órdenes: ${row.count} | ingreso: ${formatCurrency(row.revenue)}`
      doc.text(rowText, 40, y)
      y += 14
      if (y > 760) {
        doc.addPage()
        y = 48
      }
    }

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Desglose diario', 40, y)
    y += 16
    doc.setFont('helvetica', 'normal')
    for (const row of metrics.dailyRows) {
      const rowText = `${row.date} | órdenes: ${row.orders} | entregadas: ${row.delivered} | ingreso: ${formatCurrency(row.revenue)}`
      doc.text(rowText, 40, y)
      y += 14
      if (y > 760) {
        doc.addPage()
        y = 48
      }
    }

    doc.save(`reporte-beclin-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-mode">Periodo</Label>
            <Select
              id="period-mode"
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
            >
              <option value="day">Día específico</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
              <option value="range">Rango de fechas</option>
            </Select>
          </div>
          {periodMode === 'day' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metric-day">Fecha</Label>
              <Input id="metric-day" type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} />
            </div>
          )}
          {periodMode === 'month' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metric-month">Mes</Label>
              <Input id="metric-month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
          )}
          {periodMode === 'year' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metric-year">Año</Label>
              <Input id="metric-year" inputMode="numeric" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
          )}
          {periodMode === 'range' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="metric-start">Desde</Label>
                <Input id="metric-start" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="metric-end">Hasta</Label>
                <Input id="metric-end" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
              </div>
            </>
          )}
          <div className="flex items-end">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button variant="outline" className="w-full justify-start" onClick={exportExcelCsv}>
                <FileSpreadsheet className="size-4" /> Exportar Excel (CSV)
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => void exportPdfFile()}>
                <Download className="size-4" /> Exportar PDF directo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-muted/20">
        <CardContent className="p-3 text-xs text-muted-foreground">
          Los reportes incluyen órdenes, ingresos, gastos y compras de inventario del periodo filtrado.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={CircleDollarSign} label="Ingresos cobrados (periodo)" value={formatCurrency(metrics.paidRevenue)} accent="primary" />
        <Kpi icon={PackageCheck} label="Órdenes entregadas hoy" value={String(metrics.deliveredToday)} accent="success" />
        <Kpi icon={Clock} label="Órdenes activas" value={String(metrics.active)} accent="sky" />
        <Kpi icon={AlertTriangle} label="Vencidas" value={String(metrics.overdue)} accent={metrics.overdue > 0 ? 'destructive' : 'muted'} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="grid gap-2 p-4 sm:grid-cols-2">
            <MetricLine label="Órdenes en el periodo" value={String(metrics.filteredTotal)} />
            <MetricLine label="Ingresos brutos del periodo" value={formatCurrency(metrics.revenue)} />
            <MetricLine label="Ingresos pendientes por cobrar" value={formatCurrency(metrics.pendingRevenue)} />
            <MetricLine label="Gastos manuales del periodo" value={formatCurrency(metrics.expensesTotal)} />
            <MetricLine label="Compras de inventario (periodo)" value={formatCurrency(metrics.filteredInventoryPurchases)} />
            <MetricLine label="Gastos operativos totales" value={formatCurrency(metrics.operationalCosts)} />
            <MetricLine
              label="Utilidad neta"
              value={formatCurrency(metrics.net)}
              valueClassName={metrics.net >= 0 ? 'text-success' : 'text-destructive'}
            />
            <MetricLine label="Tiempo medio de proceso" value={metrics.avgTurnaround > 0 ? `${Math.round(metrics.avgTurnaround)} h` : '—'} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col justify-center gap-3 p-4">
            <MetricLine
              label="Servicio más usado"
              value={metrics.mostUsed ? `${SERVICE_LABELS[metrics.mostUsed.service]} (${metrics.mostUsed.count})` : '—'}
            />
            <MetricLine
              label="Servicio menos usado"
              value={metrics.leastUsed ? `${SERVICE_LABELS[metrics.leastUsed.service]} (${metrics.leastUsed.count})` : '—'}
            />
            <MetricLine label="Compras de inventario acumuladas" value={formatCurrency(metrics.inventoryPurchasesTotal)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <span className="font-display text-base font-800">Servicios (más usados a menos usados)</span>
          {metrics.serviceRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el periodo seleccionado.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {metrics.serviceRows.map((row) => {
                const max = metrics.serviceRows[0].count || 1
                const pct = Math.round((row.count / max) * 100)
                return (
                  <div key={row.service} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-600">
                        {SERVICE_LABELS[row.service]} <span className="text-muted-foreground">({row.count})</span>
                      </span>
                      <span className="font-700">{formatCurrency(row.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <span className="font-display text-base font-800">Desglose diario del periodo</span>
          {metrics.dailyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay movimiento en este periodo.</p>
          ) : (
            <div className="max-h-[42vh] overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Órdenes</th>
                    <th className="px-3 py-2">Entregadas</th>
                    <th className="px-3 py-2">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.dailyRows.map((row) => (
                    <tr key={row.date} className="border-t border-border">
                      <td className="px-3 py-2 font-600">{row.date}</td>
                      <td className="px-3 py-2">{row.orders}</td>
                      <td className="px-3 py-2">{row.delivered}</td>
                      <td className="px-3 py-2 font-700">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <div className={`flex size-9 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-2xl font-900 leading-none">{value}</span>
          <span className="mt-1 text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricLine({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-700 ${valueClassName ?? ''}`}>{value}</span>
    </div>
  )
}
