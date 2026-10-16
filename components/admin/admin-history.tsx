'use client'

import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'
import { useOrderItems, useOrders } from '@/lib/hooks'

function olderThanFourMonths(value: string): boolean {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const threshold = new Date()
  threshold.setMonth(threshold.getMonth() - 4)
  return date < threshold
}

export function AdminHistory() {
  const { data: orders } = useOrders()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: items } = useOrderItems(expandedId)
  const delivered = (orders ?? [])
    .filter((o) => o.status === 'delivered')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const selected = useMemo(
    () => delivered.find((order) => order.id === expandedId) ?? null,
    [delivered, expandedId],
  )
  const isPruned = selected ? olderThanFourMonths(selected.updated_at) : false

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 font-display text-base font-800">Historial de órdenes entregadas</h3>
        {delivered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay órdenes entregadas todavía.</p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {delivered.map((o) => (
              <div
                key={o.id}
                className="rounded-lg border border-border"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === o.id ? null : o.id))}
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <div>
                    <p className="font-700">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.client.name} · Entregada: {formatDate(o.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-700 text-primary">{formatCurrency(o.charged_total ?? o.total)}</p>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${
                        expandedId === o.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
                {expandedId === o.id && (
                  <div className="border-t border-border px-3 py-2 text-sm">
                    {isPruned ? (
                      <p className="text-muted-foreground">
                        El detalle de piezas de esta orden fue depurado automáticamente
                        después de 4 meses. Se conserva el folio y totales.
                      </p>
                    ) : items && items.length > 0 ? (
                      <ul className="space-y-1">
                        {items.map((item) => (
                          <li key={item.id} className="flex justify-between">
                            <span>
                              {item.quantity} × {item.name}
                            </span>
                            <span className="font-700">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">Sin detalle de piezas registrado.</p>
                    )}
                  </div>
                )}
                </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
