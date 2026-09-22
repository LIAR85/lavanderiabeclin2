'use client'

import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  BAG_LABELS,
  getNextStatus,
  MODE_LABELS,
  SERVICE_LABELS,
  STATUS_BADGE_VARIANT,
  STATUS_TO_VISIBLE,
  VISIBLE_STATUS_LABELS,
} from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  useAdvanceStatus,
  useCollectAndDeliver,
  useOrderHistory,
  useOrderItems,
} from '@/lib/hooks'
import type { OrderWithClient } from '@/lib/types'

export function OrderDetailDialog({
  order,
  onClose,
}: {
  order: OrderWithClient | null
  onClose: () => void
}) {
  const { data: items } = useOrderItems(order?.id ?? null)
  const { data: history } = useOrderHistory(order?.id ?? null)
  const advance = useAdvanceStatus()
  const collect = useCollectAndDeliver()

  const [charged, setCharged] = useState('')
  const [overrideNote, setOverrideNote] = useState('')

  useEffect(() => {
    if (order) setCharged(String(order.total))
    setOverrideNote('')
  }, [order])

  if (!order) return null

  const next = getNextStatus(order.service_type, order.status)
  const isFinal = order.status === 'delivered'
  const readyToDeliver = order.status === 'ready'
  const chargedNum = Number(charged) || 0
  const hasOverride = Math.abs(chargedNum - order.total) > 0.001

  const nextVisibleLabel = next
    ? VISIBLE_STATUS_LABELS[STATUS_TO_VISIBLE[next]] ?? next
    : ''

  async function handleAdvance() {
    if (!order || !next) return
    try {
      await advance.mutateAsync({ orderId: order.id, nextStatus: next })
      toast.success(`Estado actualizado: ${nextVisibleLabel}`)
      onClose()
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  async function handleCollect() {
    if (!order) return
    if (hasOverride && !overrideNote.trim()) {
      toast.error('Indica el motivo del ajuste de precio')
      return
    }
    try {
      await collect.mutateAsync({
        orderId: order.id,
        chargedTotal: chargedNum,
        originalTotal: order.total,
        overrideNote: overrideNote.trim() || undefined,
      })
      toast.success('Orden cobrada y entregada')
      onClose()
    } catch {
      toast.error('No se pudo completar la entrega')
    }
  }

  return (
    <Dialog
      open={!!order}
      onClose={onClose}
      title={order.order_number}
      description={`${order.client.name} · ${order.client.phone}`}
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_BADGE_VARIANT[order.status]}>
            {VISIBLE_STATUS_LABELS[order.visible_status] ?? order.visible_status}
          </Badge>
          <Badge variant="outline">{MODE_LABELS[order.service_mode]}</Badge>
          {order.payment_status === 'paid' && (
            <Badge variant="success">Pagado</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
          <Field label="Servicio" value={SERVICE_LABELS[order.service_type]} />
          <Field
            label="Bolsa"
            value={order.bag_size ? BAG_LABELS[order.bag_size] : '—'}
          />
          <Field label="Cantidad" value={`${order.quantity} carga(s)`} />
          <Field
            label="Piezas est."
            value={order.estimated_piece_count?.toString() ?? '—'}
          />
          <Field label="Entrega est." value={formatDate(order.promised_date)} />
          <Field label="Recibida" value={formatDate(order.created_at)} />
        </div>

        {order.customer_instructions && (
          <div className="rounded-lg bg-accent p-3 text-sm">
            <span className="font-700">Instrucciones: </span>
            {order.customer_instructions}
          </div>
        )}

        {items && items.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-700">Piezas especiales</span>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between p-2.5">
                  <span>
                    {it.quantity}× {it.name}
                  </span>
                  <span className="font-600">
                    {formatCurrency(it.unit_price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-600">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Extras</span>
            <span className="font-600">{formatCurrency(order.extras_total)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-display text-base font-800">Total</span>
            <span className="font-display text-xl font-900 text-primary">
              {formatCurrency(order.total)}
            </span>
          </div>
          {order.charged_total != null &&
            order.charged_total !== order.total && (
              <div className="flex justify-between text-warning-foreground">
                <span className="font-600">Cobrado</span>
                <span className="font-700">{formatCurrency(order.charged_total)}</span>
              </div>
            )}
        </div>

        {/* Timeline */}
        {history && history.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-700">Historial</span>
            <ol className="flex flex-col gap-2 border-l-2 border-border pl-4">
              {history.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute -left-[1.32rem] top-1 size-2.5 rounded-full bg-primary" />
                  <span className="font-600">
                    {VISIBLE_STATUS_LABELS[h.visible_status ?? ''] ??
                      h.visible_status ??
                      h.status}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDate(h.created_at)}
                  </span>
                  {h.note && (
                    <p className="text-xs text-muted-foreground">{h.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        {!isFinal && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {readyToDeliver ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="charged">Monto a cobrar</Label>
                  <Input
                    id="charged"
                    inputMode="decimal"
                    value={charged}
                    onChange={(e) => setCharged(e.target.value)}
                  />
                </div>
                {hasOverride && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="note">Motivo del ajuste</Label>
                    <Textarea
                      id="note"
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="Ej. descuento autorizado, cargo por pieza extra…"
                    />
                  </div>
                )}
                <Button
                  onClick={handleCollect}
                  disabled={collect.isPending}
                  className="h-12 text-base font-800"
                >
                  {collect.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="size-5" /> Cobrar {formatCurrency(chargedNum)} y
                      entregar
                    </>
                  )}
                </Button>
              </>
            ) : (
              next && (
                <Button
                  onClick={handleAdvance}
                  disabled={advance.isPending}
                  className="h-12 text-base font-800"
                >
                  {advance.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      Avanzar a {nextVisibleLabel}
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-600">{value}</span>
    </div>
  )
}
