'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'
import { useOrders } from '@/lib/hooks'

export function AdminHistory() {
  const { data: orders } = useOrders()
  const delivered = (orders ?? [])
    .filter((o) => o.status === 'delivered')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

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
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="font-700">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.client.name} · Entregada: {formatDate(o.updated_at)}
                  </p>
                </div>
                <p className="font-700 text-primary">{formatCurrency(o.charged_total ?? o.total)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
