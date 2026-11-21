'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  MODE_LABELS,
  SERVICE_LABELS,
  SERVICE_ORDER,
  STATUS_TO_VISIBLE,
  VISIBLE_STATUS_LABELS,
} from '@/lib/config'
import { formatCurrency } from '@/lib/format'
import { createLegacyOrder } from '@/lib/services'
import type { OrderStatus, ServiceMode, ServiceType } from '@/lib/types'

const STATUS_OPTIONS: OrderStatus[] = [
  'received',
  'washing',
  'drying',
  'ironing',
  'packing',
  'ready',
  'delivered',
]

function toDateInput(value: Date): string {
  const y = value.getFullYear()
  const m = `${value.getMonth() + 1}`.padStart(2, '0')
  const d = `${value.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toIsoAt3pm(dateInput: string): string {
  const [y, m, d] = dateInput.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1, 15, 0, 0, 0)
  return dt.toISOString()
}

function toIsoAt11am(dateInput: string): string {
  const [y, m, d] = dateInput.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1, 11, 0, 0, 0)
  return dt.toISOString()
}

function withThreeDays(dateInput: string): string {
  const [y, m, d] = dateInput.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + 3)
  return toDateInput(dt)
}

export function AdminLegacyOrders() {
  const qc = useQueryClient()
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('lavado')
  const [mode, setMode] = useState<ServiceMode>('regular')
  const [quantity, setQuantity] = useState('1')
  const [total, setTotal] = useState('')
  const [paidAmount, setPaidAmount] = useState('0')
  const [orderDate, setOrderDate] = useState(() => toDateInput(new Date()))
  const [requiresSpecificDeliveryDate, setRequiresSpecificDeliveryDate] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState(() => toDateInput(new Date()))
  const [status, setStatus] = useState<OrderStatus>('received')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalNum = useMemo(() => {
    const parsed = Number(total)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }, [total])

  const paidNum = useMemo(() => {
    const parsed = Number(paidAmount)
    if (!Number.isFinite(parsed) || parsed < 0) return 0
    return parsed
  }, [paidAmount])

  const pending = Math.max(0, totalNum - paidNum)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim() || clientPhone.trim().length < 7) {
      toast.error('Captura nombre y teléfono válido del cliente')
      return
    }
    if (totalNum <= 0) {
      toast.error('Captura un total válido')
      return
    }
    if (paidNum > totalNum) {
      toast.error('El abono no puede ser mayor al total')
      return
    }
    if (!orderDate) {
      toast.error('Captura la fecha de registro')
      return
    }
    if (requiresSpecificDeliveryDate && !deliveryDate) {
      toast.error('Captura la fecha de entrega específica')
      return
    }

    const effectiveDelivery = requiresSpecificDeliveryDate ? deliveryDate : withThreeDays(orderDate)

    setSubmitting(true)
    try {
      await createLegacyOrder({
        client: {
          name: clientName.trim().toLocaleUpperCase('es-MX'),
          phone: clientPhone.trim(),
          email: clientEmail.trim() || undefined,
        },
        service_type: serviceType,
        service_mode: mode,
        quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
        promised_date: toIsoAt3pm(effectiveDelivery),
        subtotal: totalNum,
        extras_total: 0,
        total: totalNum,
        paid_amount: paidNum,
        status,
        notes: notes.trim() || undefined,
        created_at: toIsoAt11am(orderDate),
        delivery_date_confirmed: requiresSpecificDeliveryDate,
      })

      await qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Orden antigua capturada')
      setClientName('')
      setClientPhone('')
      setClientEmail('')
      setQuantity('1')
      setTotal('')
      setPaidAmount('0')
      setStatus('received')
      setNotes('')
      setRequiresSpecificDeliveryDate(false)
    } catch (error) {
      console.error('[v0] legacy order create error', error)
      toast.error('No se pudo capturar la orden antigua')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 font-display text-base font-800">Captura de órdenes antiguas</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Registra pedidos existentes antes del sistema para conservar saldos y fechas reales.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-client-name">Cliente</Label>
            <Input
              id="legacy-client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value.toLocaleUpperCase('es-MX'))}
              placeholder="Nombre del cliente"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-client-phone">Teléfono</Label>
            <Input
              id="legacy-client-phone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="10 dígitos"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-client-email">Correo (opcional)</Label>
            <Input
              id="legacy-client-email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="cliente@correo.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-service-type">Servicio</Label>
            <Select
              id="legacy-service-type"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
            >
              {SERVICE_ORDER.map((option) => (
                <option key={option} value={option}>
                  {SERVICE_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-mode">Modalidad</Label>
            <Select
              id="legacy-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as ServiceMode)}
            >
              {(['regular', 'express'] as ServiceMode[]).map((option) => (
                <option key={option} value={option}>
                  {MODE_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-quantity">Cantidad</Label>
            <Input
              id="legacy-quantity"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
              placeholder="1"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-total">Total de la orden</Label>
            <Input
              id="legacy-total"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-paid">Abono capturado</Label>
            <Input
              id="legacy-paid"
              inputMode="decimal"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Saldo pendiente: {formatCurrency(pending)}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-order-date">Fecha de registro</Label>
            <Input
              id="legacy-order-date"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legacy-status">Estado actual</Label>
            <Select
              id="legacy-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {VISIBLE_STATUS_LABELS[STATUS_TO_VISIBLE[option]]}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-600">
              <input
                type="checkbox"
                checked={requiresSpecificDeliveryDate}
                onChange={(e) => setRequiresSpecificDeliveryDate(e.target.checked)}
                className="size-4"
              />
              El cliente sí pidió una fecha específica de entrega
            </label>
          </div>
          {requiresSpecificDeliveryDate && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="legacy-delivery-date">Fecha específica de entrega</Label>
              <Input
                id="legacy-delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="legacy-notes">Notas (opcional)</Label>
            <Input
              id="legacy-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referencia interna de esta captura"
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" className="h-11 w-full font-800" disabled={submitting}>
              {submitting ? <Loader2 className="size-5 animate-spin" /> : 'Registrar orden antigua'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
