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
  SERVICE_UNIT,
  SERVICE_VARIANTS,
  variantPrice,
  UNIT_LABELS,
} from '@/lib/config'
import { getSettings, saveSettings } from '@/lib/local-store'
import type { BagSize, ServiceType } from '@/lib/types'

export function AdminSettings() {
  const [settings, setSettings] = useState<PricingSettings | null>(null)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  if (!settings) return null
  const bagServices = (Object.keys(settings.basePrices) as ServiceType[]).filter(
    (service) => SERVICE_UNIT[service] === 'bolsa',
  )

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

  function setVariantPriceValue(key: string, value: string) {
    const n = Number(value)
    if (!Number.isFinite(n)) return
    setSettings((prev) =>
      prev ? { ...prev, variantPrices: { ...prev.variantPrices, [key]: n } } : prev,
    )
  }

  function persist() {
    if (!settings) return
    saveSettings(settings)
    toast.success('Precios guardados. Aplican solo a nuevas órdenes.')
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-1 p-3">
          <span className="font-display text-base font-800">{BUSINESS.name}</span>
          <span className="text-sm text-muted-foreground">{BUSINESS.slogan}</span>
        </CardContent>
      </Card>

      <Button onClick={persist} className="h-10 rounded-md px-6 font-800 self-start">
        Guardar precios
      </Button>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <span className="font-display text-base font-800">Precio de 1 bolsa por servicio</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {bagServices.map((service) => (
                <div key={service} className="rounded-lg border border-border p-2.5 flex flex-col gap-1">
                  <span className="text-sm font-700">{SERVICE_LABELS[service]}</span>
                  <p className="text-xs text-muted-foreground">
                    Precio base para bolsa completa
                  </p>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    value={String(settings.basePrices[service])}
                    onChange={(e) => setBasePrice(service, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <span className="font-display text-base font-800">Precios base por servicio</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(settings.basePrices) as ServiceType[]).map((s) => (
                <div key={s} className="rounded-lg border border-border p-2.5 flex flex-col gap-1">
                  <span className="text-sm font-700">
                    {SERVICE_LABELS[s]}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {SERVICE_VARIANTS[s]
                      ? 'se usan precios por prenda'
                      : `por ${UNIT_LABELS[SERVICE_UNIT[s]].singular}`}
                  </p>
                  <Input className="mt-1" inputMode="decimal" value={String(settings.basePrices[s])} onChange={(e) => setBasePrice(s, e.target.value)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <span className="font-display text-base font-800">Factor por tamaño de bolsa</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(settings.bagFactors) as Exclude<BagSize, 'custom'>[]).map((size) => (
                <div key={size} className="rounded-lg border border-border p-2.5 flex flex-col gap-1">
                  <span className="text-sm font-700">{BAG_LABELS[size]}</span>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    value={String(settings.bagFactors[size])}
                    onChange={(e) => setBagFactor(size, e.target.value)}
                  />
                </div>
              ))}
              <div className="rounded-lg border border-border p-2.5 flex flex-col gap-1">
                <span className="text-sm font-700">Recargo express</span>
                <Input
                  className="mt-1"
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

        <Card className="xl:col-span-2">
          <CardContent className="flex flex-col gap-3 p-3">
            <span className="font-display text-base font-800">Precios por tamaño o prenda</span>
            <div className="grid gap-2 xl:grid-cols-2">
              {(Object.keys(SERVICE_VARIANTS) as ServiceType[]).map((s) => (
                <div key={s} className="rounded-lg border border-border p-3">
                  <span className="text-sm font-800 text-foreground">{SERVICE_LABELS[s]}</span>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SERVICE_VARIANTS[s]!.map((v) => (
                      <div
                        key={v.key}
                        className="rounded-lg border border-border p-2.5 text-sm flex flex-col gap-1"
                      >
                        <span className="font-600">{v.fullLabel ?? v.label}</span>
                        <Input
                          className="mt-1"
                          inputMode="decimal"
                          value={String(variantPrice(settings, s, v))}
                          onChange={(e) => setVariantPriceValue(`${s}:${v.key}`, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <span className="font-display text-base font-800">Tiempos de entrega</span>
            <p className="text-xs text-muted-foreground">
              Estos días definen la fecha de entrega por default que sugiere el sistema al crear órdenes.
            </p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border p-2.5 flex flex-col gap-1">
                <span className="font-600">Regular (días)</span>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={String(settings.promisedDaysRegular)}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10)
                    if (!Number.isInteger(n) || n < 0) return
                    setSettings((prev) => (prev ? { ...prev, promisedDaysRegular: n } : prev))
                  }}
                />
              </div>
              <div className="rounded-lg border border-border p-2.5 flex flex-col gap-1">
                <span className="font-600">Express (días)</span>
                <Input
                  className="mt-1"
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
      </div>

      <Button onClick={persist} className="h-10 rounded-md px-6 font-800 self-start">
        Guardar precios
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
