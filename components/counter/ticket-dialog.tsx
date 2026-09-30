'use client'

import { Printer } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { BAG_LABELS, MODE_LABELS, SERVICE_LABELS } from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import type { OrderWithClient } from '@/lib/types'

export function TicketDialog({
  order,
  offline,
  onClose,
}: {
  order: OrderWithClient | null
  offline: boolean
  onClose: () => void
}) {
  if (!order) return null

  const ticketCopies = Math.max(1, Math.floor(order.estimated_piece_count ?? 1))
  const isMultipleOrder = ticketCopies > 1

  return (
    <Dialog
      open={!!order}
      onClose={onClose}
      title="Orden creada"
      description={offline ? 'Guardada localmente (sin conexión)' : 'Ticket listo para imprimir'}
    >
      <div id="printable-ticket-scope" className="p-4">
        <div id="printable-ticket-root" className="flex flex-col gap-3">
          {Array.from({ length: isMultipleOrder ? ticketCopies : 1 }, (_, idx) => {
            const pieceNumber = idx + 1
            return (
              <div
                key={`${order.id}-company-piece-${pieceNumber}`}
                className="printable-ticket mx-auto flex w-[76mm] max-w-[76mm] flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center text-black"
              >
                {isMultipleOrder && (
                  <div className="w-full rounded-md border border-black/30 bg-black px-2 py-1 text-center text-[10px] font-800 tracking-widest text-white">
                    COPIA INTERNA
                  </div>
                )}
                <div className="font-display text-2xl font-900 tracking-tight text-primary">
                  be clin
                </div>
                <div className="text-xs font-600 uppercase tracking-widest text-neutral-500">
                  Ticket empresa
                </div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <div className="font-display text-3xl font-900">{order.order_number}</div>
                <QRCodeCanvas
                  value={order.order_number}
                  size={160}
                  level="M"
                  includeMargin
                  className="rounded-lg"
                />
                <div className="w-full text-left text-sm">
                  <TicketRow label="Cliente" value={order.client.name} />
                  <TicketRow label="Teléfono" value={order.client.phone} />
                  <TicketRow label="Servicio" value={SERVICE_LABELS[order.service_type]} />
                  <TicketRow label="Modalidad" value={MODE_LABELS[order.service_mode]} />
                  <TicketRow
                    label="Bolsa"
                    value={order.bag_size ? BAG_LABELS[order.bag_size] : '—'}
                  />
                  {isMultipleOrder && (
                    <TicketRow label="Pieza" value={`${pieceNumber} de ${ticketCopies}`} />
                  )}
                  <TicketRow label="Entrega est." value={formatDate(order.promised_date)} />
                  {order.customer_instructions && (
                    <TicketRow label="Notas" value={order.customer_instructions} />
                  )}
                </div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-700">Total</span>
                  <span className="font-display text-xl font-900">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {order.payment_status === 'paid' ? 'PAGADO' : 'Pago al entregar'}
                </div>
              </div>
            )
          })}

          {isMultipleOrder && (
            <div
              key={`${order.id}-customer-summary`}
              className="printable-ticket mx-auto flex w-[76mm] max-w-[76mm] flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center text-black"
            >
              <div className="w-full rounded-md border border-black/30 bg-neutral-100 px-2 py-1 text-center text-[10px] font-800 tracking-widest text-black">
                COMPROBANTE CLIENTE
              </div>
              <div className="font-display text-2xl font-900 tracking-tight text-primary">
                be clin
              </div>
              <div className="text-xs font-600 uppercase tracking-widest text-neutral-500">
                Comprobante cliente
              </div>
              <div className="my-1 h-px w-full bg-neutral-200" />
              <div className="font-display text-3xl font-900">{order.order_number}</div>
              <QRCodeCanvas
                value={order.order_number}
                size={160}
                level="M"
                includeMargin
                className="rounded-lg"
              />
              <div className="w-full text-left text-sm">
                <TicketRow label="Cliente" value={order.client.name} />
                <TicketRow label="Teléfono" value={order.client.phone} />
                <TicketRow label="Servicio" value={SERVICE_LABELS[order.service_type]} />
                <TicketRow label="Total de piezas" value={String(ticketCopies)} />
                <TicketRow label="Entrega est." value={formatDate(order.promised_date)} />
              </div>
              <div className="my-1 h-px w-full bg-neutral-200" />
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-700">Total</span>
                <span className="font-display text-xl font-900">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400">
                Conserva este comprobante para recoger tu pedido.
              </div>
            </div>
          )}
        </div>

        {isMultipleOrder && (
          <div className="no-print mt-3 text-center text-xs text-muted-foreground">
            Se imprimirán {ticketCopies} tickets de empresa y 1 comprobante para cliente.
          </div>
        )}

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

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-600">{value}</span>
    </div>
  )
}
