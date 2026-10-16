'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOrders } from '@/lib/hooks'
import {
  type DailyIroningConfig,
  type DeliveryCapacityConfig,
  getDeliveryCapacityConfig,
  saveDeliveryCapacityConfig,
} from '@/lib/local-store'
import {
  dateKeyFromIso,
  getIroningPieceLimit,
  getScheduledIroningPieces,
} from '@/lib/schedule'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

type CalendarCell = {
  dateKey: string
  dayNumber: number
  inMonth: boolean
}

function getDateKeyFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstDay = new Date(year, monthIndex, 1)
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, monthIndex, 1 - firstWeekday)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    return {
      dateKey: getDateKeyFromDate(d),
      dayNumber: d.getDate(),
      inMonth: d.getMonth() === monthIndex,
    }
  })
}

function cloneDayConfig(day: DailyIroningConfig): DailyIroningConfig {
  return {
    limits: { ...day.limits },
    unlimited: { ...day.unlimited },
  }
}

function getDayConfig(config: DeliveryCapacityConfig, dateKey: string): DailyIroningConfig {
  return cloneDayConfig(config.byDate[dateKey] ?? config.defaultConfig)
}

function parseLimit(input: string, fallback: number): number {
  const n = Number.parseInt(input, 10)
  if (!Number.isInteger(n) || n < 0) return fallback
  return n
}

export function DeliveryCalendar({
  editable = false,
}: {
  editable?: boolean
}) {
  const { data: orders } = useOrders()
  const [config, setConfig] = useState(() => getDeliveryCapacityConfig())
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(() => getDateKeyFromDate(today))
  const [dailyPlanchadoLimit, setDailyPlanchadoLimit] = useState('40')
  const [dailyLavadoPlanchadoLimit, setDailyLavadoPlanchadoLimit] = useState('40')
  const [dailyPlanchadoUnlimited, setDailyPlanchadoUnlimited] = useState(false)
  const [dailyLavadoPlanchadoUnlimited, setDailyLavadoPlanchadoUnlimited] = useState(false)

  const [defaultPlanchadoLimit, setDefaultPlanchadoLimit] = useState('40')
  const [defaultLavadoPlanchadoLimit, setDefaultLavadoPlanchadoLimit] = useState('40')
  const [defaultPlanchadoUnlimited, setDefaultPlanchadoUnlimited] = useState(false)
  const [defaultLavadoPlanchadoUnlimited, setDefaultLavadoPlanchadoUnlimited] = useState(false)

  const [bulkEnabled, setBulkEnabled] = useState(true)
  const [bulkStartDate, setBulkStartDate] = useState(() => getDateKeyFromDate(today))
  const [bulkEndDate, setBulkEndDate] = useState(() => getDateKeyFromDate(today))
  const [bulkPlanchadoLimit, setBulkPlanchadoLimit] = useState('40')
  const [bulkLavadoPlanchadoLimit, setBulkLavadoPlanchadoLimit] = useState('40')
  const [bulkPlanchadoUnlimited, setBulkPlanchadoUnlimited] = useState(false)
  const [bulkLavadoPlanchadoUnlimited, setBulkLavadoPlanchadoUnlimited] = useState(false)

  useEffect(() => {
    const day = getDayConfig(config, selectedDate)
    setDailyPlanchadoLimit(String(day.limits.planchado))
    setDailyLavadoPlanchadoLimit(String(day.limits.lavado_planchado))
    setDailyPlanchadoUnlimited(day.unlimited.planchado)
    setDailyLavadoPlanchadoUnlimited(day.unlimited.lavado_planchado)
  }, [config, selectedDate])

  useEffect(() => {
    const base = config.defaultConfig
    setDefaultPlanchadoLimit(String(base.limits.planchado))
    setDefaultLavadoPlanchadoLimit(String(base.limits.lavado_planchado))
    setDefaultPlanchadoUnlimited(base.unlimited.planchado)
    setDefaultLavadoPlanchadoUnlimited(base.unlimited.lavado_planchado)
  }, [config])

  const countsByDate = useMemo(() => {
    const all = orders ?? []
    const grouped = new Map<string, number>()

    for (const o of all) {
      if (!o.promised_date) continue
      const key = dateKeyFromIso(o.promised_date)
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }

    return grouped
  }, [orders])

  const monthCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const monthSummary = useMemo(() => {
    const all = orders ?? []
    let total = 0

    for (const o of all) {
      if (!o.promised_date) continue
      const d = new Date(o.promised_date)
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) continue
      total += 1
    }

    return { total }
  }, [orders, viewYear, viewMonth])

  const todayKey = getDateKeyFromDate(today)

  const monthIroning = useMemo(() => {
    return monthCells
      .filter((cell) => cell.inMonth)
      .map((cell) => {
        const planchadoUsed = getScheduledIroningPieces(
          orders ?? [],
          cell.dateKey,
          'planchado',
        )
        const lavadoPlanchadoUsed = getScheduledIroningPieces(
          orders ?? [],
          cell.dateKey,
          'lavado_planchado',
        )
        const planchadoMax = getIroningPieceLimit(cell.dateKey, 'planchado')
        const lavadoPlanchadoMax = getIroningPieceLimit(
          cell.dateKey,
          'lavado_planchado',
        )
        const planchadoOver = planchadoMax != null && planchadoUsed >= planchadoMax
        const lavadoPlanchadoOver =
          lavadoPlanchadoMax != null && lavadoPlanchadoUsed >= lavadoPlanchadoMax
        return {
          dateKey: cell.dateKey,
          planchadoUsed,
          lavadoPlanchadoUsed,
          planchadoMax,
          lavadoPlanchadoMax,
          overLimit: planchadoOver || lavadoPlanchadoOver,
        }
      })
      .filter((row) => row.overLimit)
  }, [monthCells, orders])

  function saveSelectedCapacity() {
    const current = getDayConfig(config, selectedDate)
    const nextDay = cloneDayConfig(current)

    nextDay.unlimited.planchado = dailyPlanchadoUnlimited
    nextDay.unlimited.lavado_planchado = dailyLavadoPlanchadoUnlimited

    if (!dailyPlanchadoUnlimited) {
      nextDay.limits.planchado = parseLimit(
        dailyPlanchadoLimit,
        current.limits.planchado,
      )
    }
    if (!dailyLavadoPlanchadoUnlimited) {
      nextDay.limits.lavado_planchado = parseLimit(
        dailyLavadoPlanchadoLimit,
        current.limits.lavado_planchado,
      )
    }

    const next = {
      ...config,
      byDate: {
        ...config.byDate,
        [selectedDate]: nextDay,
      },
    }
    setConfig(next)
    saveDeliveryCapacityConfig(next)
  }

  function saveDefaultCapacity() {
    const base = config.defaultConfig
    const next = {
      ...config,
      defaultConfig: {
        limits: {
          planchado: defaultPlanchadoUnlimited
            ? base.limits.planchado
            : parseLimit(defaultPlanchadoLimit, base.limits.planchado),
          lavado_planchado: defaultLavadoPlanchadoUnlimited
            ? base.limits.lavado_planchado
            : parseLimit(
                defaultLavadoPlanchadoLimit,
                base.limits.lavado_planchado,
              ),
        },
        unlimited: {
          planchado: defaultPlanchadoUnlimited,
          lavado_planchado: defaultLavadoPlanchadoUnlimited,
        },
      },
    }
    setConfig(next)
    saveDeliveryCapacityConfig(next)
  }

  function saveBulkCapacity() {
    if (!bulkEnabled) return
    const start = new Date(`${bulkStartDate}T00:00:00`)
    const end = new Date(`${bulkEndDate}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
    if (end < start) return

    const nextByDate = { ...config.byDate }
    const fallback = config.defaultConfig
    const safePlanchado = parseLimit(bulkPlanchadoLimit, fallback.limits.planchado)
    const safeLavadoPlanchado = parseLimit(
      bulkLavadoPlanchadoLimit,
      fallback.limits.lavado_planchado,
    )

    const cursor = new Date(start)
    while (cursor <= end) {
      const key = getDateKeyFromDate(cursor)
      const current = getDayConfig(config, key)
      nextByDate[key] = {
        limits: {
          planchado: bulkPlanchadoUnlimited
            ? current.limits.planchado
            : safePlanchado,
          lavado_planchado: bulkLavadoPlanchadoUnlimited
            ? current.limits.lavado_planchado
            : safeLavadoPlanchado,
        },
        unlimited: {
          planchado: bulkPlanchadoUnlimited,
          lavado_planchado: bulkLavadoPlanchadoUnlimited,
        },
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const next = {
      ...config,
      byDate: nextByDate,
    }
    setConfig(next)
    saveDeliveryCapacityConfig(next)
  }

  function goToPrevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function goToNextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function onMonthSelect(value: string) {
    const nextMonth = Number.parseInt(value, 10)
    if (Number.isNaN(nextMonth) || nextMonth < 0 || nextMonth > 11) return
    setViewMonth(nextMonth)
  }

  function onYearSelect(value: string) {
    const nextYear = Number.parseInt(value, 10)
    if (Number.isNaN(nextYear)) return
    setViewYear(nextYear)
  }

  const yearOptions = [viewYear - 1, viewYear, viewYear + 1]

  return (
    <div className="flex flex-col gap-4">
      {editable && (
        <Card>
          <CardHeader>
            <CardTitle>Topes de piezas por servicio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-day">Día</Label>
                <Input
                  id="cap-day"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-day-max-p">Tope planchado (piezas)</Label>
                <Input
                  id="cap-day-max-p"
                  inputMode="numeric"
                  value={dailyPlanchadoLimit}
                  onChange={(e) => setDailyPlanchadoLimit(e.target.value)}
                  disabled={dailyPlanchadoUnlimited}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={dailyPlanchadoUnlimited}
                    onChange={(e) => setDailyPlanchadoUnlimited(e.target.checked)}
                  />
                  Sin límite para planchado
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-day-max-lp">Tope lavado + planchado (piezas)</Label>
                <Input
                  id="cap-day-max-lp"
                  inputMode="numeric"
                  value={dailyLavadoPlanchadoLimit}
                  onChange={(e) => setDailyLavadoPlanchadoLimit(e.target.value)}
                  disabled={dailyLavadoPlanchadoUnlimited}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={dailyLavadoPlanchadoUnlimited}
                    onChange={(e) =>
                      setDailyLavadoPlanchadoUnlimited(e.target.checked)
                    }
                  />
                  Sin límite para lavado + planchado
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSelectedCapacity}>Guardar tope del día</Button>
            </div>

            <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-default-p">Tope por defecto planchado</Label>
                <Input
                  id="cap-default-p"
                  inputMode="numeric"
                  value={defaultPlanchadoLimit}
                  onChange={(e) => setDefaultPlanchadoLimit(e.target.value)}
                  disabled={defaultPlanchadoUnlimited}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={defaultPlanchadoUnlimited}
                    onChange={(e) => setDefaultPlanchadoUnlimited(e.target.checked)}
                  />
                  Sin límite por defecto
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-default-lp">Tope por defecto lavado + planchado</Label>
                <Input
                  id="cap-default-lp"
                  inputMode="numeric"
                  value={defaultLavadoPlanchadoLimit}
                  onChange={(e) => setDefaultLavadoPlanchadoLimit(e.target.value)}
                  disabled={defaultLavadoPlanchadoUnlimited}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={defaultLavadoPlanchadoUnlimited}
                    onChange={(e) =>
                      setDefaultLavadoPlanchadoUnlimited(e.target.checked)
                    }
                  />
                  Sin límite por defecto
                </label>
              </div>
              <div className="sm:col-span-2">
                <Button variant="outline" onClick={saveDefaultCapacity}>
                  Guardar topes por defecto
                </Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label className="flex items-center gap-2 text-sm font-600">
                  <input
                    type="checkbox"
                    checked={bulkEnabled}
                    onChange={(e) => setBulkEnabled(e.target.checked)}
                  />
                  Aplicar topes por rango de fechas
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-start">Desde</Label>
                <Input
                  id="bulk-start"
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  disabled={!bulkEnabled}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-end">Hasta</Label>
                <Input
                  id="bulk-end"
                  type="date"
                  value={bulkEndDate}
                  onChange={(e) => setBulkEndDate(e.target.value)}
                  disabled={!bulkEnabled}
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={saveBulkCapacity}
                  disabled={!bulkEnabled}
                >
                  Aplicar rango
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-p-limit">Planchado por día</Label>
                <Input
                  id="bulk-p-limit"
                  inputMode="numeric"
                  value={bulkPlanchadoLimit}
                  onChange={(e) => setBulkPlanchadoLimit(e.target.value)}
                  disabled={!bulkEnabled || bulkPlanchadoUnlimited}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={bulkPlanchadoUnlimited}
                    onChange={(e) => setBulkPlanchadoUnlimited(e.target.checked)}
                    disabled={!bulkEnabled}
                  />
                  Sin límite planchado
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-lp-limit">Lavado + planchado por día</Label>
                <Input
                  id="bulk-lp-limit"
                  inputMode="numeric"
                  value={bulkLavadoPlanchadoLimit}
                  onChange={(e) => setBulkLavadoPlanchadoLimit(e.target.value)}
                  disabled={!bulkEnabled || bulkLavadoPlanchadoUnlimited}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={bulkLavadoPlanchadoUnlimited}
                    onChange={(e) =>
                      setBulkLavadoPlanchadoUnlimited(e.target.checked)
                    }
                    disabled={!bulkEnabled}
                  />
                  Sin límite lavado + planchado
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-gradient-to-b from-background via-muted/20 to-background">
        <CardHeader>
          <CardTitle className="text-foreground">Calendario mensual de entregas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPrevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="text-sm font-700">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={viewMonth}
                onChange={(e) => onMonthSelect(e.target.value)}
              >
                {MONTH_LABELS.map((month, idx) => (
                  <option key={month} value={idx}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={viewYear}
                onChange={(e) => onYearSelect(e.target.value)}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
              <p className="text-muted-foreground">Total de órdenes del mes</p>
              <p className="text-lg font-800 text-foreground">{monthSummary.total}</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-700 text-muted-foreground">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthCells.map((cell) => {
              const total = countsByDate.get(cell.dateKey) ?? 0
              const pUsed = getScheduledIroningPieces(
                orders ?? [],
                cell.dateKey,
                'planchado',
              )
              const lpUsed = getScheduledIroningPieces(
                orders ?? [],
                cell.dateKey,
                'lavado_planchado',
              )
              const pLimit = getIroningPieceLimit(cell.dateKey, 'planchado')
              const lpLimit = getIroningPieceLimit(cell.dateKey, 'lavado_planchado')
              const overLimit =
                (pLimit != null && pUsed >= pLimit) ||
                (lpLimit != null && lpUsed >= lpLimit)

              return (
                <div
                  key={cell.dateKey}
                  className={
                    cell.inMonth
                      ? 'min-h-20 rounded-lg border border-border bg-background p-1.5 text-xs shadow-sm'
                      : 'min-h-20 rounded-lg border border-border/60 bg-muted/30 p-1.5 text-xs text-muted-foreground'
                  }
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={
                        cell.dateKey === todayKey
                          ? 'rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-700 text-primary-foreground'
                          : 'text-[11px] font-700'
                      }
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.inMonth && overLimit && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-700 text-amber-800">Límite</span>
                    )}
                  </div>
                  <div className="space-y-0.5 text-[10px] leading-tight">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-700 text-foreground">{total}</span>
                    </div>
                    {editable && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">LyP piezas</span>
                          <span className="font-700 text-foreground">
                            {lpUsed}/{lpLimit == null ? '∞' : lpLimit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">P piezas</span>
                          <span className="font-700 text-foreground">
                            {pUsed}/{pLimit == null ? '∞' : pLimit}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {monthIroning.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {monthIroning.length} día(s) del mes superan o alcanzan tope de piezas.
            </div>
          )}

          {!editable && <div className="text-[11px] text-muted-foreground">El total diario incluye todas las categorías de servicio.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
