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
  formatAmount,
  getNextStatus,
  MODE_LABELS,
  SERVICE_ORDER,
  SERVICE_LABELS,
  SERVICE_UNIT,
  STATUS_BADGE_VARIANT,
  STATUS_TO_VISIBLE,
  UNIT_LABELS,
  VISIBLE_STATUS_LABELS,
} from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  useAdvanceStatus,
  useCollectAndDeliver,
  useOrderHistory,
  useOrderItems,
} from '@/lib/hooks'
import { hasPartialPayment, paidAmount, pendingAmount } from '@/lib/payments'
import type { OrderItem, OrderWithClient, ServiceType } from '@/lib/types'

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
  const [confirmingCollect, setConfirmingCollect] = useState(false)

  useEffect(() => {
    if (order) setCharged(String(order.total))
    setOverrideNote('')
    setConfirmingCollect(false)
  }, [order])

  if (!order) return null

  const next = getNextStatus(order.service_type, order.status)
  const isFinal = order.status === 'delivered'
  const readyToDeliver = order.status === 'ready'
  const alreadyPaid = paidAmount(order)
  const remainingBalance = pendingAmount(order)
  const partialActive = hasPartialPayment(order)
  const chargedNum = Number(charged) || 0
  const hasOverride = Math.abs(chargedNum - order.total) > 0.001
  const hasLavadoPlanchadoInOrder =
    order.service_type === 'lavado_planchado' ||
    (items ?? []).some(
      (item) =>
        item.variant_key?.startsWith('lavado_planchado:') ||
        item.name.includes(SERVICE_LABELS.lavado_planchado),
    )

  const nextVisibleLabel = next
    ? VISIBLE_STATUS_LABELS[STATUS_TO_VISIBLE[next]] ?? next
    : ''

  async function handleAdvance() {
    if (!order || !next) return
    try {
      await advance.mutateAsync({ orderId: order.id, nextStatus: next })

      if (next === 'ready') {
        try {
          const response = await fetch('/api/notifications/order-ready', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id }),
          })

          if (!response.ok) {
            const payload = await response.json().catch(() => null)
            throw new Error(payload?.detail ?? payload?.error ?? 'No se pudo notificar por WhatsApp')
          }

          const payload = (await response.json().catch(() => null)) as
            | { skipped?: boolean; reason?: string }
            | null

          if (payload?.skipped) {
            if (payload.reason === 'INVALID_PHONE' || payload.reason === 'MISSING_PHONE') {
              toast.warning('Orden marcada como lista, pero el teléfono del cliente no es válido para WhatsApp')
            } else if (payload.reason === 'MONTHLY_LIMIT_REACHED') {
              toast.warning('Orden marcada como lista, pero se alcanzó el límite mensual de WhatsApp')
            }
          } else {
            toast.success('Notificación de WhatsApp enviada al cliente')
          }
        } catch (notifyErr) {
          console.warn('[v0] order-ready whatsapp warning', notifyErr)
          toast.warning('Orden marcada como lista, pero falló la notificación de WhatsApp')
        }
      }

      toast.success(`Estado actualizado: ${nextVisibleLabel}`)
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

      try {
        const response = await fetch('/api/notifications/order-collected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: order.order_number,
            clientName: order.client.name,
            chargedTotal: chargedNum,
            originalTotal: order.total,
            paymentOverridden: hasOverride,
            overrideNote: overrideNote.trim() || undefined,
          }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'No se pudo enviar correo de cobro')
        }
      } catch (notifyErr) {
        console.warn('[v0] order-collected email warning', notifyErr)
        toast.warning('Entrega completada, pero falló el aviso por correo interno')
      }

      toast.success('Orden cobrada y entregada')
      setConfirmingCollect(false)
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
      className={hasLavadoPlanchadoInOrder ? 'sm:max-w-4xl' : undefined}
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

        <div
          className={
            hasLavadoPlanchadoInOrder
              ? 'grid grid-cols-1 gap-3 rounded-lg border border-border p-3 text-sm sm:grid-cols-2 lg:grid-cols-3'
              : 'grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm'
          }
        >
          <Field label="Servicio" value={SERVICE_LABELS[order.service_type]} />
          <Field
            label="Cantidad"
            value={formatAmount(order.service_type, order.bag_size, order.quantity)}
          />
          <Field
            label="Piezas est."
            value={order.estimated_piece_count?.toString() ?? '—'}
          />
          {(order.delivery_date_confirmed ?? true) && (
            <Field label="Entrega est." value={formatDate(order.promised_date)} />
          )}
          <Field label="Recibida" value={formatDate(order.created_at)} />
        </div>

        {order.customer_instructions && (
          <div className="rounded-lg bg-accent p-3 text-sm">
            <span className="font-700">Instrucciones: </span>
            {order.customer_instructions}
          </div>
        )}

        {(items ?? []).length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-700">Desglose marcado</span>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
              {(items ?? []).map((it) => {
                const detail = formatItemDetail(order, it)
                return (
                  <div key={it.id} className="flex justify-between gap-2 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-600">{detail.label}</p>
                      <p className="text-xs text-muted-foreground">{detail.quantityLabel}</p>
                    </div>
                    <span className="whitespace-nowrap font-600">
                      {formatCurrency(it.unit_price * it.quantity)}
                    </span>
                  </div>
                )
              })}
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
          {partialActive && (
            <>
              <div className="flex justify-between text-primary">
                <span className="font-600">Abonado</span>
                <span className="font-700">{formatCurrency(alreadyPaid)}</span>
              </div>
              <div className="flex justify-between text-warning-foreground">
                <span className="font-600">Saldo pendiente</span>
                <span className="font-700">{formatCurrency(remainingBalance)}</span>
              </div>
            </>
          )}
        </div>

        {/* Timeline */}
        {history && history.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-700">Historial</span>
            <ol className="flex w-full pb-1">
              {history.map((h, idx) => (
                <li
                  key={h.id}
                  className="min-w-0 flex-1"
                >
                  <div className="flex min-w-0 flex-col">
                    <div className="relative h-3">
                      {idx < history.length - 1 && (
                        <span className="absolute left-2.5 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                      )}
                      <span className="absolute left-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-primary" />
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-600 leading-tight">
                        {VISIBLE_STATUS_LABELS[h.visible_status ?? ''] ??
                          h.visible_status ??
                          h.status}
                      </span>
                      <p className="text-xs leading-tight text-muted-foreground">
                        {formatDate(h.created_at)}
                      </p>
                      {h.note && (
                        <p className="text-xs text-muted-foreground">{h.note}</p>
                      )}
                    </div>
                  </div>
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
                {!confirmingCollect ? (
                  <div
                    className={
                      hasOverride
                        ? 'grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end'
                        : 'grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'
                    }
                  >
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
                      onClick={() => setConfirmingCollect(true)}
                      disabled={collect.isPending}
                      className="h-12 text-base font-800 md:min-w-72"
                    >
                      <>
                        <Check className="size-5" /> Cobrar {formatCurrency(chargedNum)} y
                        entregar
                      </>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-warning-foreground/40 bg-warning/10 p-3">
                    <p className="text-sm font-700">
                      ¿Confirmas que deseas terminar esta orden?
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Se marcará como entregada y cobrada por{' '}
                      {formatCurrency(chargedNum)}.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmingCollect(false)}
                        disabled={collect.isPending}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleCollect} disabled={collect.isPending}>
                        {collect.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          'Sí, terminar orden'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
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

function parseItemServiceType(item: OrderItem): ServiceType | undefined {
  const fromVariant = item.variant_key?.split(':')[0]
  if (fromVariant && SERVICE_ORDER.includes(fromVariant as ServiceType)) {
    return fromVariant as ServiceType
  }
  return (Object.entries(SERVICE_LABELS).find(
    ([, label]) => item.name === label || item.name.startsWith(`${label} ·`),
  )?.[0] ??
    undefined) as ServiceType | undefined
}

function formatItemDetail(
  order: OrderWithClient,
  item: OrderItem,
): { label: string; quantityLabel: string } {
  const serviceType = parseItemServiceType(item)

  if (item.variant_key === 'otro:manual') {
    return {
      label: item.name.replace(/^Otro ·\s*/, ''),
      quantityLabel: `${item.quantity} pza(s)`,
    }
  }

  const isLavadoPlanchadoLine =
    item.variant_key?.startsWith('lavado_planchado:') ||
    serviceType === 'lavado_planchado' ||
    item.name.startsWith(`${SERVICE_LABELS.lavado_planchado} ·`)

  if (isLavadoPlanchadoLine && item.kind !== 'addon') {
    const isSpecial = !item.kind || item.kind === 'extra'
    const cleanName = item.name.replace(/^Especial ·\s*/, '')
    const [baseName, ...detailParts] = cleanName.split(' · ')
    const bagLabel =
      detailParts.length > 0
        ? detailParts.join(' · ')
        : `${item.quantity} ${item.quantity === 1 ? 'bolsa' : 'bolsas'}`
    const pieces = order.estimated_piece_count ?? 0
    return {
      label: `${isSpecial ? 'Especial · ' : ''}${baseName || SERVICE_LABELS.lavado_planchado}`,
      quantityLabel:
        pieces > 0 ? `${bagLabel} + ${pieces} pza(s) a planchar` : bagLabel,
    }
  }

  if (!item.kind || item.kind === 'extra') {
    return {
      label: `Especial · ${item.name}`,
      quantityLabel: `${item.quantity} pza(s)`,
    }
  }

  const quantityLabel = serviceType
    ? `${item.quantity} ${
      item.quantity === 1
        ? UNIT_LABELS[SERVICE_UNIT[serviceType]].singular
        : UNIT_LABELS[SERVICE_UNIT[serviceType]].plural
    }`
    : `${item.quantity} pza(s)`

  return {
    label: item.name,
    quantityLabel,
  }
}
