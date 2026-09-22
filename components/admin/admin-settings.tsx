'use client'

import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  BAG_LABELS,
  BUSINESS,
  type PricingSettings,
  SERVICE_LABELS,
  SPECIAL_ITEMS_CATALOG,
} from '@/lib/config'
import { formatCurrency } from '@/lib/format'
import { getSettings } from '@/lib/local-store'
import type { BagSize, ServiceType } from '@/lib/types'

export function AdminSettings() {
  const [settings, setSettings] = useState<PricingSettings | null>(null)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  if (!settings) return null

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
              <div key={s} className="flex justify-between text-sm">
                <span className="font-600">{SERVICE_LABELS[s]}</span>
                <span className="font-700">
                  {formatCurrency(settings.basePrices[s])}
                </span>
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
              <div key={size} className="flex justify-between text-sm">
                <span className="font-600">{BAG_LABELS[size]}</span>
                <span className="font-700">×{settings.bagFactors[size]}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="font-600">Recargo express</span>
              <span className="font-700">×{settings.expressMultiplier}</span>
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
            <div className="flex justify-between">
              <span className="font-600">Regular</span>
              <span className="font-700">{settings.promisedDaysRegular} día(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="font-600">Express</span>
              <span className="font-700">{settings.promisedDaysExpress} día(s)</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
