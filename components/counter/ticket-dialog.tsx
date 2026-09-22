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

  return (
    <Dialog
      open={!!order}
      onClose={onClose}
      title="Orden creada"
      description={offline ? 'Guardada localmente (sin conexión)' : 'Ticket listo para imprimir'}
    >
      <div className="p-4">
        <div
          id="printable-ticket"
          className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-border bg-white p-5 text-center text-black"
        >
          <div className="font-display text-2xl font-900 tracking-tight text-primary">
            be clin
          </div>
          <div className="text-xs font-600 uppercase tracking-widest text-neutral-500">
            Expertos Lavando
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
            {order.payment_status === 'paid'
              ? 'PAGADO'
              : 'Pago al entregar'}
          </div>
          <div className="text-[10px] text-neutral-400">
            Conserva este ticket. Presenta el QR para recoger tu pedido.
          </div>
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

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-600">{value}</span>
    </div>
  )
}
