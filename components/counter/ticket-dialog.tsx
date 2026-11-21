'use client'

import { Printer } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { formatAmount, MODE_LABELS, SERVICE_LABELS } from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import { useOrderItems } from '@/lib/hooks'
import { hasPartialPayment, paidAmount, pendingAmount } from '@/lib/payments'
import type { OrderItem, OrderWithClient } from '@/lib/types'

export function TicketDialog({
  order,
  offline,
  onClose,
}: {
  order: OrderWithClient | null
  offline: boolean
  onClose: () => void
}) {
  const { data: items } = useOrderItems(order?.id ?? null)

  if (!order) return null

  const printableItems = (items ?? []).filter((item) => item.quantity > 0)
  const showDeliveryDate = order.delivery_date_confirmed ?? true
  const partialPaid = paidAmount(order)
  const partialPending = pendingAmount(order)
  const partialActive = hasPartialPayment(order)
  const totalPieces = printableItems.reduce(
    (sum, item) => sum + (item.kind === 'addon' ? 0 : item.quantity),
    0,
  )

  return (
    <Dialog
      open={!!order}
      onClose={onClose}
      title="Orden creada"
      description={offline ? 'Guardada localmente (sin conexión)' : 'Ticket listo para imprimir'}
    >
      <div id="printable-ticket-scope" className="p-4">
        <div id="printable-ticket-root" className="flex flex-col gap-3">
          <div className="printable-ticket mx-auto flex w-[76mm] max-w-[76mm] flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center text-black">
            <div className="w-full rounded-md border border-black bg-black px-2 py-1 text-center text-xs font-800 tracking-widest text-white">
              COPIA EMPRESA
            </div>
            <div className="font-display text-2xl font-900 tracking-tight text-primary">
              be clin
            </div>
            <div className="text-xs font-700 uppercase tracking-widest text-black">
              Ticket de servicio
            </div>
            <div className="my-1 h-px w-full bg-neutral-300" />
            <div className="font-display text-2xl font-900 leading-none tracking-tight whitespace-nowrap">
              {order.order_number}
            </div>
            <QRCodeCanvas
              value={order.order_number}
              size={160}
              level="M"
              includeMargin
              className="rounded-lg"
            />
            <div className="w-full text-left text-base">
              <TicketRow label="Cliente" value={order.client.name} />
              <TicketRow label="Teléfono" value={order.client.phone} />
              <TicketRow label="Servicio" value={MODE_LABELS[order.service_mode]} />
              <TicketRow
                label="Cantidad"
                value={formatAmount(order.service_type, order.bag_size, order.quantity)}
              />
              <TicketRow label="Piezas" value={String(Math.max(1, totalPieces || order.quantity || 1))} />
              {showDeliveryDate && (
                <TicketRow label="Entrega est." value={formatDate(order.promised_date)} />
              )}
              {order.customer_instructions && (
                <TicketRow label="Notas" value={order.customer_instructions} />
              )}
              {partialActive && (
                <>
                  <TicketRow label="Abonado" value={formatCurrency(partialPaid)} />
                  <TicketRow label="Saldo" value={formatCurrency(partialPending)} />
                </>
              )}
            </div>
            {printableItems.length > 0 && (
              <div className="w-full rounded-md border border-neutral-400 p-2 text-left text-sm">
                <p className="mb-1 font-700 text-black">Desglose</p>
                <div className="flex flex-col gap-1">
                  {printableItems.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="line-clamp-2">
                        {formatBreakdownLabel(order, item)}
                      </span>
                      <span className="whitespace-nowrap font-700">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="my-1 h-px w-full bg-neutral-300" />
            <div className="flex w-full items-center justify-between">
              <span className="text-base font-700">Total</span>
              <span className="font-display text-xl font-900">
                {formatCurrency(order.total)}
              </span>
            </div>
            <div className="text-sm font-600 text-black">
              {partialActive
                ? 'Abono parcial registrado'
                : order.payment_status === 'paid'
                  ? 'PAGADO'
                  : 'Pago al entregar'}
            </div>
          </div>

          <div className="ticket-cut-line mx-auto w-[76mm] max-w-[76mm] border-t-2 border-dashed border-black py-1 text-center text-xs font-800 tracking-widest text-black">
            CORTAR AQUÍ
          </div>

          <div className="printable-ticket mx-auto flex w-[76mm] max-w-[76mm] flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center text-black">
            <div className="w-full rounded-md border border-black bg-white px-2 py-1 text-center text-xs font-800 tracking-widest text-black">
              COPIA CLIENTE
            </div>
            <div className="font-display text-2xl font-900 tracking-tight text-primary">
              be clin
            </div>
            <div className="text-xs font-700 uppercase tracking-widest text-black">
              Comprobante de servicio
            </div>
            <div className="my-1 h-px w-full bg-neutral-300" />
            <div className="font-display text-2xl font-900 leading-none tracking-tight whitespace-nowrap">
              {order.order_number}
            </div>
            <QRCodeCanvas
              value={order.order_number}
              size={160}
              level="M"
              includeMargin
              className="rounded-lg"
            />
            <div className="w-full text-left text-base">
              <TicketRow label="Cliente" value={order.client.name} />
              <TicketRow label="Teléfono" value={order.client.phone} />
              <TicketRow label="Servicio" value={MODE_LABELS[order.service_mode]} />
              <TicketRow
                label="Cantidad"
                value={formatAmount(order.service_type, order.bag_size, order.quantity)}
              />
              <TicketRow label="Piezas" value={String(Math.max(1, totalPieces || order.quantity || 1))} />
              {showDeliveryDate && (
                <TicketRow label="Entrega est." value={formatDate(order.promised_date)} />
              )}
              {partialActive && (
                <>
                  <TicketRow label="Abonado" value={formatCurrency(partialPaid)} />
                  <TicketRow label="Saldo" value={formatCurrency(partialPending)} />
                </>
              )}
            </div>
            <div className="my-1 h-px w-full bg-neutral-300" />
            <div className="flex w-full items-center justify-between">
              <span className="text-base font-700">Total</span>
              <span className="font-display text-xl font-900">
                {formatCurrency(order.total)}
              </span>
            </div>
            <div className="text-sm font-600 text-black">
              Conserva este comprobante para recoger tu pedido.
            </div>
          </div>
        </div>

        <div className="no-print mt-3 text-center text-xs text-muted-foreground">
          Se imprimirán 2 tickets: copia empresa y copia cliente.
        </div>

        <div className="no-print mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function formatBreakdownLabel(order: OrderWithClient, item: OrderItem): string {
  const isLavadoPlanchadoBase =
    item.variant_key === 'lavado_planchado:base' ||
    (!item.variant_key && item.name.startsWith(`${SERVICE_LABELS.lavado_planchado} ·`))

  if (isLavadoPlanchadoBase) {
    const pieces = order.estimated_piece_count ?? 0
    if (pieces > 0) {
      return `${item.name} · ${pieces} ${pieces === 1 ? 'pieza' : 'piezas'} planchado`
    }
    return item.name
  }

  const isBaseServiceLine =
    (item.kind === 'service' && item.variant_key?.endsWith(':base')) ||
    (!item.variant_key &&
      Object.values(SERVICE_LABELS).some((serviceLabel) =>
        item.name.startsWith(`${serviceLabel} ·`),
      ))

  if (isBaseServiceLine) {
    return item.name
  }
  return `${item.quantity}× ${item.name}`
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-neutral-300 py-1">
      <span className="shrink-0 font-700 text-black">{label}</span>
      <span className="min-w-0 break-words text-right font-600 text-black">{value}</span>
    </div>
  )
}
