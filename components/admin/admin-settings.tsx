'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  BAG_LABELS,
  BUSINESS,
  type PricingSettings,
  SERVICE_LABELS,
  SPECIAL_ITEMS_CATALOG,
} from '@/lib/config'
import { formatCurrency } from '@/lib/format'
import { getSettings, saveSettings } from '@/lib/local-store'
import type { BagSize, ServiceType } from '@/lib/types'

export function AdminSettings() {
  const [settings, setSettings] = useState<PricingSettings | null>(null)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  if (!settings) return null

  function setBasePrice(service: ServiceType, value: string) {
    const n = Number(value)
    if (!Number.isFinite(n)) return
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            basePrices: { ...prev.basePrices, [service]: n },
          }
        : prev,
    )
  }

  function setBagFactor(size: Exclude<BagSize, 'custom'>, value: string) {
    const n = Number(value)
    if (!Number.isFinite(n)) return
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            bagFactors: { ...prev.bagFactors, [size]: n },
          }
        : prev,
    )
  }

  function persist() {
    if (!settings) return
    saveSettings(settings)
    toast.success('Ajustes guardados. Aplican solo a nuevas órdenes.')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="font-display text-base font-800">{BUSINESS.name}</span>
          <span className="text-sm text-muted-foreground">{BUSINESS.slogan}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <span className="font-display text-base font-800">
            Precios base por servicio
          </span>
          <div className="flex flex-col gap-2">
            {(Object.keys(settings.basePrices) as ServiceType[]).map((s) => (
              <div key={s} className="grid items-center gap-2 text-sm sm:grid-cols-[1fr_140px]">
                <span className="font-600">{SERVICE_LABELS[s]}</span>
                <Input
                  inputMode="decimal"
                  value={String(settings.basePrices[s])}
                  onChange={(e) => setBasePrice(s, e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <span className="font-display text-base font-800">
            Factor por tamaño de bolsa
          </span>
          <div className="flex flex-col gap-2">
            {(
              Object.keys(settings.bagFactors) as Exclude<BagSize, 'custom'>[]
            ).map((size) => (
              <div key={size} className="grid items-center gap-2 text-sm sm:grid-cols-[1fr_140px]">
                <span className="font-600">{BAG_LABELS[size]}</span>
                <Input
                  inputMode="decimal"
                  value={String(settings.bagFactors[size])}
                  onChange={(e) => setBagFactor(size, e.target.value)}
                />
              </div>
            ))}
            <div className="grid items-center gap-2 text-sm sm:grid-cols-[1fr_140px]">
              <span className="font-600">Recargo express</span>
              <Input
                inputMode="decimal"
                value={String(settings.expressMultiplier)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (!Number.isFinite(n)) return
                  setSettings((prev) => (prev ? { ...prev, expressMultiplier: n } : prev))
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <span className="font-display text-base font-800">
            Prendas especiales
          </span>
          <div className="flex flex-col gap-2">
            {SPECIAL_ITEMS_CATALOG.map((s) => (
              <div key={s.name} className="flex justify-between text-sm">
                <span className="font-600">{s.name}</span>
                <span className="font-700">{formatCurrency(s.price)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <span className="font-display text-base font-800">Tiempos de entrega</span>
          <div className="flex flex-col gap-2 text-sm">
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_140px]">
              <span className="font-600">Regular</span>
              <Input
                inputMode="numeric"
                value={String(settings.promisedDaysRegular)}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10)
                  if (!Number.isInteger(n) || n < 0) return
                  setSettings((prev) => (prev ? { ...prev, promisedDaysRegular: n } : prev))
                }}
              />
            </div>
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_140px]">
              <span className="font-600">Express</span>
              <Input
                inputMode="numeric"
                value={String(settings.promisedDaysExpress)}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10)
                  if (!Number.isInteger(n) || n < 0) return
                  setSettings((prev) => (prev ? { ...prev, promisedDaysExpress: n } : prev))
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={persist} className="font-700">
        Guardar ajustes
      </Button>

      <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Las órdenes y clientes se guardan en Supabase. Inventario, gastos y
          personal se guardan localmente en este dispositivo.
        </p>
      </div>
    </div>
  )
}
