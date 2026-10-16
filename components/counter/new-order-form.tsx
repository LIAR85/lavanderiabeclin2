'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Zap,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  formatAmount,
  INSTRUCTION_PRESETS,
  MODE_LABELS,
  SERVICE_LABELS,
  SERVICE_ORDER,
  SERVICE_UNIT,
  SERVICE_VARIANTS,
  type ServiceVariant,
  UNIT_LABELS,
  variantPrice,
} from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import { getSettings } from '@/lib/local-store'
import { enqueueOrder } from '@/lib/offline-queue'
import { computePrice, computePromisedDate } from '@/lib/pricing'
import { useOrders } from '@/lib/hooks'
import {
  getIroningPieceLimit,
  getScheduledIroningPieces,
  isIroningRestrictedService,
} from '@/lib/schedule'
import {
  createOrder,
  findClientByPhone,
  localOrderNumber,
} from '@/lib/services'
import type {
  BagSize,
  NewOrderInput,
  OrderWithClient,
  ServiceMode,
  ServiceType,
  SpecialItemInput,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { SERVICE_ICONS } from './service-icons'

const FRACTION_OPTIONS: Exclude<BagSize, 'full' | 'custom'>[] = [
  'quarter',
  'half',
  'threequarter',
]
const COUNT_OPTIONS = [1, 2, 3, 5, 10]
const FRACTION_SYMBOLS: Record<(typeof FRACTION_OPTIONS)[number], string> = {
  quarter: '¼',
  half: '½',
  threequarter: '¾',
}
type ServiceAmountSelection = {
  bagSize: BagSize
  quantity: string
  manualAmount: boolean
  touched: boolean
}

const DEFAULT_AMOUNT_SELECTION: ServiceAmountSelection = {
  bagSize: 'full',
  quantity: '1',
  manualAmount: false,
  touched: false,
}

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toPromisedIsoAt3pm(dateInput: string): string {
  const [y, m, d] = dateInput.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1, 15, 0, 0, 0)
  return dt.toISOString()
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err

  if (err && typeof err === 'object') {
    const maybe = err as {
      message?: string
      error?: string
      details?: string
      hint?: string
      code?: string
    }

    const parts = [
      maybe.message,
      maybe.error,
      maybe.details,
      maybe.hint,
      maybe.code ? `codigo: ${maybe.code}` : undefined,
    ].filter(Boolean)

    if (parts.length > 0) return parts.join(' | ')

    try {
      const raw = JSON.stringify(err)
      if (raw && raw !== '{}') return raw
    } catch {
      // Ignore stringify failures and fall back to generic message.
    }
  }

  return 'Error desconocido al crear la orden.'
}

export function NewOrderForm({
  online,
  onCreated,
}: {
  online: boolean
  onCreated: (order: OrderWithClient, offline: boolean) => void
}) {
  const qc = useQueryClient()
  const settings = useMemo(() => getSettings(), [])
  const { data: orders } = useOrders()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lookupState, setLookupState] = useState<'idle' | 'searching' | 'found' | 'new'>(
    'idle',
  )

  const [serviceType, setServiceType] = useState<ServiceType>('lavado')
  const [mode, setMode] = useState<ServiceMode>('regular')
  const [amountByService, setAmountByService] = useState<
    Partial<Record<ServiceType, ServiceAmountSelection>>
  >({})
  const [variantQtyByService, setVariantQtyByService] = useState<
    Partial<Record<ServiceType, Record<string, number>>>
  >({})
  const [otherDescription, setOtherDescription] = useState('')
  const [otherUnitPrice, setOtherUnitPrice] = useState('')
  const [pieceCount, setPieceCount] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(() =>
    toDateInput(computePromisedDate(settings, 'regular')),
  )
  const [editingDate, setEditingDate] = useState(false)
  const [dateTouched, setDateTouched] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const [specialItems, setSpecialItems] = useState<SpecialItemInput[]>([])
  const [instructions, setInstructions] = useState<string[]>([])
  const [freeInstruction, setFreeInstruction] = useState('')
  const [paymentTiming, setPaymentTiming] = useState<'on_receipt' | 'on_delivery'>(
    'on_delivery',
  )
  const [manualChargeEnabled, setManualChargeEnabled] = useState(false)
  const [manualChargeAmount, setManualChargeAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function lookupPhone() {
    const clean = phone.trim()
    if (clean.length < 7) {
      toast.error('Captura un teléfono válido para buscar al cliente')
      return
    }
    if (!online) {
      toast.warning('Sin conexión: no se puede buscar al cliente')
      return
    }
    setLookupState('searching')
    try {
      const client = await findClientByPhone(clean)
      if (client) {
        setName(client.name)
        setEmail(client.email ?? '')
        setLookupState('found')
      } else {
        setLookupState('new')
        nameRef.current?.focus()
      }
    } catch {
      setLookupState('idle')
      toast.error('No se pudo buscar al cliente')
    }
  }

  function handlePhoneChange(value: string) {
    setPhone(value)
    if (lookupState === 'found') {
      setName('')
      setEmail('')
    }
    if (lookupState !== 'idle') setLookupState('idle')
  }

  function serviceAmountSelection(
    service: ServiceType,
    source: Partial<Record<ServiceType, ServiceAmountSelection>> = amountByService,
  ): ServiceAmountSelection {
    return source[service] ?? DEFAULT_AMOUNT_SELECTION
  }

  function updateServiceAmount(
    service: ServiceType,
    updater: (current: ServiceAmountSelection) => ServiceAmountSelection,
  ) {
    setAmountByService((prev) => ({
      ...prev,
      [service]: updater(serviceAmountSelection(service, prev)),
    }))
  }

  function selectService(next: ServiceType) {
    if (next === serviceType) return
    setServiceType(next)
  }

  function selectMode(next: ServiceMode) {
    setMode(next)
    if (!dateTouched) {
      setDeliveryDate(toDateInput(computePromisedDate(settings, next)))
    }
  }

  function pickFraction(size: Exclude<BagSize, 'full' | 'custom'>) {
    updateServiceAmount(serviceType, (current) => ({
      ...current,
      bagSize: size,
      quantity: '1',
      manualAmount: false,
      touched: true,
    }))
  }

  function pickCount(n: number) {
    updateServiceAmount(serviceType, (current) => ({
      ...current,
      bagSize: 'full',
      quantity: String(n),
      manualAmount: false,
      touched: true,
    }))
  }

  function setVariantCount(key: string, value: number) {
    setVariantQtyByService((prev) => ({
      ...prev,
      [serviceType]: {
        ...(prev[serviceType] ?? {}),
        [key]: Math.max(0, Math.min(999, value)),
      },
    }))
  }

  function pickManual() {
    updateServiceAmount(serviceType, (current) => ({
      ...current,
      bagSize: 'full',
      quantity: '',
      manualAmount: true,
      touched: true,
    }))
  }

  const currentAmount = serviceAmountSelection(serviceType)
  const bagSize = currentAmount.bagSize
  const quantity = currentAmount.quantity
  const manualAmount = currentAmount.manualAmount
  const variants = SERVICE_VARIANTS[serviceType]
  const currentVariantQty = variantQtyByService[serviceType] ?? {}
  const otherLine = useMemo<SpecialItemInput | null>(() => {
    if (serviceType !== 'otro') return null
    const unitPrice = Number(otherUnitPrice)
    const qty = Number(quantity) || 0
    if (!otherDescription.trim() || !Number.isFinite(unitPrice) || unitPrice <= 0 || qty <= 0) {
      return null
    }
    return {
      name: `Otro · ${otherDescription.trim()}`,
      quantity: qty,
      unit_price: unitPrice,
      kind: 'service',
      variant_key: 'otro:manual',
    }
  }, [otherDescription, otherUnitPrice, quantity, serviceType])
  const baseServiceLines = useMemo<SpecialItemInput[] | undefined>(() => {
    const lines: SpecialItemInput[] = []
    for (const s of SERVICE_ORDER) {
      if (SERVICE_VARIANTS[s] || s === 'otro') continue
      const selected = s === serviceType ? currentAmount : amountByService[s]
      if (!selected) continue
      if (s !== serviceType && !selected.touched) continue

      const qty = Number.parseInt(selected.quantity, 10)
      if (!Number.isInteger(qty) || qty <= 0) continue

      const unitPrice =
        (settings.basePrices[s] ?? 0) *
        (SERVICE_UNIT[s] === 'bolsa' && selected.bagSize !== 'full'
          ? settings.bagFactors[selected.bagSize as Exclude<BagSize, 'custom'>] ?? 1
          : 1)

      lines.push({
        name: `${SERVICE_LABELS[s]} · ${formatAmount(s, selected.bagSize, qty)}`,
        quantity: qty,
        unit_price: unitPrice,
        kind: 'service',
        variant_key: `${s}:base`,
      })
    }
    return lines.length > 0 ? lines : undefined
  }, [amountByService, currentAmount, serviceType, settings])
  const allServiceLines = useMemo<SpecialItemInput[] | undefined>(() => {
    const lines: SpecialItemInput[] = []
    lines.push(...(baseServiceLines ?? []))
    for (const s of SERVICE_ORDER) {
      const serviceVariants = SERVICE_VARIANTS[s]
      if (!serviceVariants) continue
      const qtyByKey = variantQtyByService[s] ?? {}
      for (const v of serviceVariants) {
        const q = qtyByKey[v.key] ?? 0
        if (q <= 0) continue
        lines.push({
          name: `${SERVICE_LABELS[s]} · ${v.fullLabel ?? v.label}`,
          quantity: q,
          unit_price: variantPrice(settings, s, v),
          kind: v.addon ? ('addon' as const) : ('service' as const),
          variant_key: `${s}:${v.key}`,
        })
      }
    }
    return lines.length > 0 ? lines : undefined
  }, [baseServiceLines, settings, variantQtyByService])
  const globalServiceLines = useMemo<SpecialItemInput[] | undefined>(() => {
    const lines = [...(allServiceLines ?? [])]
    if (otherLine) lines.push(otherLine)
    return lines.length > 0 ? lines : undefined
  }, [allServiceLines, otherLine])
  const selectedServiceTypes = useMemo(
    () =>
      Array.from(
        new Set(
          (globalServiceLines ?? [])
            .filter((l) => l.kind !== 'addon')
            .map((l) => l.variant_key?.split(':')[0])
            .filter(Boolean),
        ),
      ) as ServiceType[],
    [globalServiceLines],
  )
  const bagVariantMode = !!variants?.some((v) => v.bagFactor)
  const equivalentBags = bagVariantMode
    ? variants!.reduce(
        (sum, v) => sum + (currentVariantQty[v.key] ?? 0) * (v.bagFactor ?? 0),
        0,
      )
    : 0
  const onlyHalfBags =
    bagVariantMode &&
    variants!.every((v) => (currentVariantQty[v.key] ?? 0) === 0 || v.bagFactor === 0.5)
  const linesQty = variants
    ? variants.reduce(
        (sum, v) => sum + (v.addon ? 0 : (currentVariantQty[v.key] ?? 0)),
        0,
      )
    : 0
  const globalLinesQty = (globalServiceLines ?? []).reduce(
    (sum, l) => sum + (l.kind === 'addon' ? 0 : l.quantity),
    0,
  )
  const amountQty = globalServiceLines
    ? globalLinesQty
    : Number(quantity)
  const storedBagSize: BagSize =
    bagVariantMode && onlyHalfBags && linesQty > 0 ? 'half' : bagSize
  const serviceTypeForOrder =
    selectedServiceTypes.length === 1 ? selectedServiceTypes[0] : serviceType

  const price = useMemo(
    () =>
      computePrice({
        settings,
        serviceType: serviceTypeForOrder,
        serviceMode: mode,
        bagSize: storedBagSize,
        quantity: amountQty || 1,
        serviceLines: globalServiceLines,
        specialItems,
      }),
    [
      settings,
      serviceTypeForOrder,
      mode,
      storedBagSize,
      amountQty,
      globalServiceLines,
      specialItems,
    ],
  )

  const promisedDate = useMemo(
    () => toPromisedIsoAt3pm(deliveryDate),
    [deliveryDate],
  )

  const ironingRestricted = useMemo(
    () => isIroningRestrictedService(serviceType),
    [serviceType],
  )

  const parsedPieceCount = useMemo(() => {
    if (!pieceCount) return null
    const n = Number.parseInt(pieceCount, 10)
    if (!Number.isInteger(n) || n <= 0) return null
    return n
  }, [pieceCount])

  const pieceCountValid = !ironingRestricted || parsedPieceCount != null

  const ironingCapacity = useMemo(
    () => getIroningPieceLimit(deliveryDate, serviceType),
    [deliveryDate, serviceType],
  )

  const scheduledIroning = useMemo(
    () => getScheduledIroningPieces(orders ?? [], deliveryDate, serviceType),
    [orders, deliveryDate, serviceType],
  )

  const requestedIroningPieces = parsedPieceCount ?? 0
  const hasCapacityForIroning =
    !ironingRestricted ||
    ironingCapacity == null ||
    scheduledIroning + requestedIroningPieces <= ironingCapacity

  const chargeAmount = useMemo(() => {
    if (!manualChargeEnabled) return price.total
    const parsed = Number(manualChargeAmount)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }, [manualChargeAmount, manualChargeEnabled, price.total])

  function toggleInstruction(preset: string) {
    setInstructions((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset],
    )
  }

  function reset() {
    setName('')
    setPhone('')
    setEmail('')
    setLookupState('idle')
    setServiceType('lavado')
    setMode('regular')
    setAmountByService({})
    setVariantQtyByService({})
    setPieceCount('')
    setOtherDescription('')
    setOtherUnitPrice('')
    setDeliveryDate(toDateInput(computePromisedDate(settings, 'regular')))
    setEditingDate(false)
    setDateTouched(false)
    setShowInstructions(false)
    setSpecialItems([])
    setInstructions([])
    setFreeInstruction('')
    setPaymentTiming('on_delivery')
    setManualChargeEnabled(false)
    setManualChargeAmount('')
    setNotes('')
  }

  async function sendOrderCreatedEmail(params: {
    orderNumber: string
    clientName: string
    clientEmail?: string
    serviceType: ServiceType
    pieceCount?: number
    orderLines?: Array<{ name: string; quantity: number; unitPrice: number }>
    total: number
    promisedDateIso: string
  }) {
    const response = await fetch('/api/notifications/order-created', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const detail = [payload?.error, payload?.detail].filter(Boolean).join(' | ')
      throw new Error(detail || 'No se pudo enviar el correo de confirmacion')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || phone.trim().length < 7) {
      toast.error('Captura nombre y teléfono válido del cliente')
      return
    }
    if (!deliveryDate) {
      toast.error('Selecciona una fecha de entrega')
      return
    }
    if (!(amountQty > 0)) {
      toast.error(
        variants ? 'Agrega al menos una pieza (los extras solos no cuentan)' : 'Captura la cantidad del servicio',
      )
      return
    }
    if (serviceType === 'otro' && !otherLine) {
      toast.error('En "Otro" captura descripción, precio y cantidad válidos')
      return
    }
    if (!pieceCountValid) {
      toast.error('Captura un número de piezas válido para este servicio')
      return
    }
    if (!hasCapacityForIroning) {
      toast.error('No hay capacidad disponible de piezas para la fecha seleccionada')
      return
    }
    if (manualChargeEnabled && chargeAmount <= 0) {
      toast.error('Captura un monto manual de cobro válido')
      return
    }
    const allInstructions = [
      ...instructions,
      ...(freeInstruction.trim() ? [freeInstruction.trim()] : []),
    ].join(' · ')
    const emailOrderLines = [
      ...((globalServiceLines ?? []).map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unit_price,
      })) ?? []),
      ...specialItems.map((line) => ({
        name: `Especial · ${line.name}`,
        quantity: line.quantity,
        unitPrice: line.unit_price,
      })),
    ]

    const input: NewOrderInput = {
      client: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
      service_type: serviceTypeForOrder,
      service_mode: mode,
      bag_size: storedBagSize,
      quantity: amountQty || 1,
      estimated_piece_count: parsedPieceCount ?? undefined,
      service_lines: globalServiceLines,
      special_items: specialItems,
      customer_instructions: allInstructions || undefined,
      notes: notes.trim() || undefined,
      payment_timing: paymentTiming,
      promised_date: promisedDate,
      subtotal: price.subtotal,
      extras_total: price.extrasTotal,
      total: price.total,
      charged_total: paymentTiming === 'on_receipt' ? chargeAmount : undefined,
    }

    setSubmitting(true)
    try {
      if (online) {
        const order = await createOrder(input)
        qc.invalidateQueries({ queryKey: ['orders'] })

        try {
          await sendOrderCreatedEmail({
            orderNumber: order.order_number,
            clientName: order.client.name,
            clientEmail: order.client.email ?? undefined,
            serviceType: order.service_type,
            pieceCount: amountQty || undefined,
            orderLines: emailOrderLines,
            total: chargeAmount,
            promisedDateIso: order.promised_date ?? promisedDate,
          })
        } catch (emailErr) {
          console.warn('[v0] sendOrderCreatedEmail warning', emailErr)
          const msg = getErrorMessage(emailErr)
          toast.warning('Orden creada, pero no se pudo enviar el correo automatico', {
            description: msg,
          })
        }

        onCreated(order, false)
        toast.success(`Orden ${order.order_number} creada`)
        reset()
      } else {
        const order_number = localOrderNumber()
        enqueueOrder({
          id: order_number,
          input,
          order_number,
          queued_at: new Date().toISOString(),
        })
        const nowIso = new Date().toISOString()
        const pseudo: OrderWithClient = {
          id: order_number,
          order_number,
          client_id: 'offline',
          service_type: serviceTypeForOrder,
          service_mode: mode,
          bag_size: storedBagSize,
          estimated_piece_count: parsedPieceCount ?? null,
          estimated_weight: null,
          quantity: amountQty || 1,
          promised_date: promisedDate,
          subtotal: price.subtotal,
          extras_total: price.extrasTotal,
          total: price.total,
          status: 'received',
          visible_status: 'RECIBIDA',
          customer_instructions: allInstructions || null,
          payment_timing: paymentTiming,
          payment_status: paymentTiming === 'on_receipt' ? 'paid' : 'pending',
          charged_total: paymentTiming === 'on_receipt' ? chargeAmount : null,
          price_overridden:
            paymentTiming === 'on_receipt' && Math.abs(chargeAmount - price.total) > 0.001,
          price_override_note:
            paymentTiming === 'on_receipt' && Math.abs(chargeAmount - price.total) > 0.001
              ? 'Cobro manual capturado al crear la orden'
              : null,
          anomaly_tags: [],
          has_anomalies: false,
          notes: notes.trim() || null,
          created_at: nowIso,
          updated_at: nowIso,
          client: {
            id: 'offline',
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            created_at: nowIso,
            updated_at: nowIso,
          },
        }
        onCreated(pseudo, true)
        toast.message('Sin conexión: orden guardada localmente', {
          description: 'Se sincronizará automáticamente al reconectar.',
        })
        reset()
      }
    } catch (err) {
      const details = getErrorMessage(err)
      console.error('[v0] createOrder error', {
        details,
        raw: err,
      })
      toast.error('No se pudo crear la orden.', {
        description: details,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const unit = SERVICE_UNIT[serviceType]
  const unitLabels = UNIT_LABELS[unit]
  const isBagUnit = unit === 'bolsa'
  const showBagFramePrices =
    serviceType === 'lavado' || serviceType === 'lavado_planchado' || serviceType === 'secado'
  const baseBagPrice = (settings.basePrices[serviceType] ?? 0) * (mode === 'express' ? settings.expressMultiplier : 1)
  function bagOptionPrice(factor: number) {
    return formatCurrency(baseBagPrice * factor)
  }
  const hasMixedServices = selectedServiceTypes.length > 1
  const instructionsCount = instructions.length + (freeInstruction.trim() ? 1 : 0)
  const quickBreakdown = useMemo(() => {
    const serviceRows = (globalServiceLines ?? []).map((line) => ({
      label: line.name,
      quantity: line.quantity,
      amount: line.quantity * line.unit_price,
    }))
    const extrasRows = specialItems.map((item) => ({
      label: `Especial · ${item.name}`,
      quantity: item.quantity,
      amount: item.quantity * item.unit_price,
    }))
    return [...serviceRows, ...extrasRows]
  }, [globalServiceLines, specialItems])

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"
    >
      <div className="flex min-w-0 flex-col gap-4">
        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Input
                  id="phone"
                  name="beclin-cliente-telefono"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void lookupPhone()
                    }
                  }}
                  placeholder="10 dígitos y presiona Enter"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => void lookupPhone()}
                  disabled={lookupState === 'searching'}
                  aria-label="Buscar cliente por teléfono"
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {lookupState === 'searching' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : lookupState === 'found' ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <Search className="size-4" />
                  )}
                </button>
              </div>
              {lookupState === 'found' && (
                <span className="text-xs font-600 text-success">
                  Cliente frecuente — datos cargados
                </span>
              )}
              {lookupState === 'new' && (
                <span className="text-xs text-muted-foreground">
                  Cliente nuevo — captura su nombre
                </span>
              )}
              {(lookupState === 'idle' || lookupState === 'searching') && (
                <span className="text-xs text-muted-foreground">
                  Presiona Enter para buscar al cliente
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                ref={nameRef}
                name="beclin-cliente-nombre"
                autoComplete="off"
                autoCorrect="off"
                data-lpignore="true"
                data-1p-ignore="true"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                name="beclin-cliente-email"
                type="email"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Service */}
        <Card>
          <CardHeader>
            <CardTitle>Servicio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Tipo de servicio</Label>
              <div
                role="radiogroup"
                aria-label="Tipo de servicio"
                className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-10"
              >
                {SERVICE_ORDER.map((s) => {
                  const Icon = SERVICE_ICONS[s]
                  const selected = serviceType === s
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => selectService(s)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center transition-all',
                        selected
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-input bg-background text-foreground hover:border-primary/50 hover:bg-accent',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-14 items-center justify-center rounded-full',
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="size-8" />
                      </span>
                      <span className="text-sm font-800 leading-tight">
                        {SERVICE_LABELS[s]}
                      </span>
                      <span className="text-xs font-500 text-muted-foreground">
                        por {UNIT_LABELS[SERVICE_UNIT[s]].singular}
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedServiceTypes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  En esta orden:{' '}
                  {selectedServiceTypes
                    .map((s) => SERVICE_LABELS[s])
                    .join(hasMixedServices ? ' + ' : '')}
                </p>
              )}
            </div>

            <div className="grid animate-in gap-5 fade-in slide-in-from-top-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
              <div className="flex flex-col gap-2">
                {variants ? (
                  <>
                    <Label>¿Qué piezas recibes? Toca para sumar</Label>
                    {groupVariants(variants).map(({ group, items }) => (
                      <div key={group ?? 'all'} className="flex flex-col gap-2">
                        {group && (
                          <span className="border-b border-border pb-1 text-sm font-800 uppercase tracking-wide text-primary">
                            {group}
                          </span>
                        )}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
                          {items.map((v) => (
                            <VariantTile
                              key={v.key}
                              label={v.label}
                              price={variantPrice(settings, serviceType, v)}
                              promo={v.promo}
                              count={currentVariantQty[v.key] ?? 0}
                              onChange={(n) => setVariantCount(v.key, n)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-sm font-600 text-muted-foreground">
                      {bagVariantMode
                        ? `Total: ${equivalentBags} ${equivalentBags === 1 ? 'bolsa' : 'bolsas'}`
                        : `Total: ${linesQty} ${linesQty === 1 ? unitLabels.singular : unitLabels.plural}`}
                    </p>
                  </>
                ) : (
                  <>
                <Label>Cantidad de {unitLabels.plural}</Label>
                    <div className="flex flex-wrap gap-2">
                      {isBagUnit &&
                        FRACTION_OPTIONS.map((f) => (
                          <AmountChip
                            key={f}
                            big={FRACTION_SYMBOLS[f]}
                            caption={unitLabels.singular}
                            amountLabel={showBagFramePrices ? bagOptionPrice(settings.bagFactors[f] ?? 1) : undefined}
                            selected={!manualAmount && bagSize === f}
                            onClick={() => pickFraction(f)}
                          />
                        ))}
                      {COUNT_OPTIONS.map((n) => (
                        <AmountChip
                          key={n}
                          big={String(n)}
                          caption={n === 1 ? unitLabels.singular : unitLabels.plural}
                          amountLabel={showBagFramePrices ? bagOptionPrice(n) : undefined}
                          selected={
                            !manualAmount && bagSize === 'full' && Number(quantity) === n
                          }
                          onClick={() => pickCount(n)}
                        />
                      ))}
                      <AmountChip
                        big="Otra"
                        caption="cantidad"
                        selected={manualAmount}
                        onClick={pickManual}
                      />
                    </div>
                    {manualAmount && (
                      <div className="flex max-w-xs flex-col gap-1.5">
                        <Label htmlFor="qty">Escribe la cantidad</Label>
                        <Input
                          id="qty"
                          inputMode="numeric"
                          autoComplete="off"
                          autoFocus
                          value={quantity}
                          onChange={(e) =>
                            updateServiceAmount(serviceType, (current) => ({
                              ...current,
                              quantity: e.target.value.replace(/\D/g, ''),
                              touched: true,
                            }))
                          }
                          placeholder={`Ej. 12 ${unitLabels.plural}`}
                        />
                      </div>
                    )}
                    {serviceType === 'otro' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="other-description">Descripción de mercancía</Label>
                          <Input
                            id="other-description"
                            autoComplete="off"
                            value={otherDescription}
                            onChange={(e) => setOtherDescription(e.target.value)}
                            placeholder="Ej. Herramientas, uniforme, etc."
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="other-price">Precio por pieza</Label>
                          <Input
                            id="other-price"
                            inputMode="decimal"
                            autoComplete="off"
                            value={otherUnitPrice}
                            onChange={(e) => setOtherUnitPrice(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {ironingRestricted && (
                  <div className="flex max-w-xs flex-col gap-1.5">
                    <Label htmlFor="pieces">Piezas estimadas (obligatorio)</Label>
                    <Input
                      id="pieces"
                      inputMode="numeric"
                      autoComplete="off"
                      value={pieceCount}
                      onChange={(e) => setPieceCount(e.target.value)}
                      placeholder="Ej. 4 (imprime 4 tickets)"
                      required={ironingRestricted}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Modalidad</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['regular', 'express'] as ServiceMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => selectMode(m)}
                      className={cn(
                        'flex h-16 items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-700 transition-colors',
                        mode === m
                          ? m === 'express'
                            ? 'border-brand-yellow bg-brand-yellow text-warning-foreground'
                            : 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background text-foreground',
                      )}
                    >
                      {m === 'express' && <Zap className="size-4" />}
                      {MODE_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <CalendarDays className="size-5 text-primary" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs text-muted-foreground">Entrega programada</span>
                  <span className="text-sm font-700">{formatDate(promisedDate)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDate((v) => !v)}
                  className="ml-auto text-sm font-700 text-primary hover:underline"
                >
                  {editingDate ? 'Listo' : 'Cambiar fecha'}
                </button>
              </div>
              {editingDate && (
                <div className="flex max-w-xs flex-col gap-1.5">
                  <Label htmlFor="delivery-date">Fecha de entrega</Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={deliveryDate}
                    min={toDateInput(new Date())}
                    onChange={(e) => {
                      setDeliveryDate(e.target.value)
                      setDateTouched(true)
                    }}
                    required
                  />
                  <span className="text-xs text-muted-foreground">
                    Hora fija de entrega: 3:00 PM
                  </span>
                </div>
              )}
              {ironingRestricted && (
                <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                  <span className="font-600">Capacidad de piezas para ese día</span>
                  <span className="text-muted-foreground">
                    Programadas: {scheduledIroning} pieza(s) / Máximo: {ironingCapacity == null ? 'Sin límite' : `${ironingCapacity} pieza(s)`}
                  </span>
                  {pieceCountValid && parsedPieceCount != null && (
                    <span className="text-muted-foreground">
                      Esta orden agrega: {parsedPieceCount} pieza(s)
                    </span>
                  )}
                  {!hasCapacityForIroning && (
                    <span className="font-700 text-destructive">
                      Día sin cupo suficiente de piezas para este servicio.
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid items-start gap-4">
          {/* Instructions & notes */}
          <CollapsibleCard
            title="Instrucciones del cliente"
            open={showInstructions}
            onToggle={() => setShowInstructions((v) => !v)}
            count={instructionsCount}
          >
            <div className="flex flex-wrap gap-2">
              {INSTRUCTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => toggleInstruction(preset)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-600 transition-colors',
                    instructions.includes(preset)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Textarea
              value={freeInstruction}
              onChange={(e) => setFreeInstruction(e.target.value)}
              placeholder="Instrucciones adicionales…"
            />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas (no visibles para el cliente)"
            />
          </CollapsibleCard>
        </div>
      </div>

      {/* Summary sidebar */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Resumen y cobro</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Servicio" value={SERVICE_LABELS[serviceType]} />
              <Row
                label="Modalidad"
                value={
                  mode === 'express' ? (
                    <Badge variant="warning">
                      <Zap className="size-3" /> Express
                    </Badge>
                  ) : (
                    'Regular'
                  )
                }
              />
              <Row
                label="Cantidad"
                value={
                  hasMixedServices
                    ? `${amountQty} piezas`
                    : bagVariantMode
                    ? `${equivalentBags} ${equivalentBags === 1 ? 'bolsa' : 'bolsas'}`
                    : variants
                      ? `${amountQty} ${amountQty === 1 ? unitLabels.singular : unitLabels.plural}`
                      : formatAmount(serviceType, storedBagSize, amountQty || 1)
                }
              />
              <Row label="Entrega estimada" value={formatDate(promisedDate)} />
            </div>

            {quickBreakdown.length > 0 && (
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                <span className="px-1 text-xs font-700 text-muted-foreground">
                  Desglose rápido
                </span>
                {quickBreakdown.map((line, idx) => (
                  <div
                    key={`${line.label}-${idx}`}
                    className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-md px-1 py-1 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-600">{line.label}</p>
                      <p className="text-muted-foreground">{line.quantity} pza(s)</p>
                    </div>
                    <span className="font-700">{formatCurrency(line.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
              <Row label="Subtotal" value={formatCurrency(price.subtotal)} />
              <Row label="Extras" value={formatCurrency(price.extrasTotal)} />
              <div className="flex items-center justify-between pt-1">
                <span className="font-display text-base font-800">Total</span>
                <span className="font-display text-2xl font-900 text-primary">
                  {formatCurrency(price.total)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Momento de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['on_receipt', 'Al recibir'],
                  ['on_delivery', 'Al entregar'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPaymentTiming(val)}
                    className={cn(
                      'h-10 rounded-lg border text-sm font-700 transition-colors',
                      paymentTiming === val
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-600">
                <input
                  type="checkbox"
                  checked={manualChargeEnabled}
                  onChange={(e) => setManualChargeEnabled(e.target.checked)}
                  className="size-4"
                />
                Capturar monto de cobro manual
              </label>
              {manualChargeEnabled && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manual-charge">Monto a cobrar</Label>
                  <Input
                    id="manual-charge"
                    inputMode="decimal"
                    value={manualChargeAmount}
                    onChange={(e) => setManualChargeAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Monto que se usará para cobro: {formatCurrency(chargeAmount)}
              </p>
            </div>

            <Button
              type="submit"
              disabled={
                submitting ||
                !deliveryDate ||
                !(amountQty > 0) ||
                !hasCapacityForIroning ||
                (ironingRestricted && !pieceCountValid)
              }
              className="h-12 w-full text-base font-800"
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>Crear orden · {formatCurrency(chargeAmount)}</>
              )}
            </Button>
            {!online && (
              <p className="text-center text-xs font-600 text-warning-foreground">
                Modo sin conexión — se sincroniza al reconectar
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-600">{value}</span>
    </div>
  )
}

function AmountChip({
  big,
  caption,
  amountLabel,
  selected,
  onClick,
}: {
  big: string
  caption: string
  amountLabel?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex h-16 min-w-16 flex-col items-center justify-center rounded-xl border-2 px-3 transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-input bg-background text-foreground hover:border-primary/50 hover:bg-accent',
      )}
    >
      <span className="font-display text-xl font-800 leading-none">{big}</span>
      <span className="mt-1 text-xs font-600 opacity-80">{caption}</span>
      {amountLabel && <span className="text-[11px] font-700 opacity-90">{amountLabel}</span>}
    </button>
  )
}

function CollapsibleCard({
  title,
  open,
  onToggle,
  count,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 font-display text-lg font-800 leading-tight">
          {title}
          {count > 0 && <Badge variant="sky">{count}</Badge>}
        </span>
        <ChevronDown
          className={cn(
            'size-5 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <CardContent className="flex flex-col gap-3">{children}</CardContent>}
    </Card>
  )
}

function groupVariants(variants: ServiceVariant[]) {
  const groups: { group?: string; items: ServiceVariant[] }[] = []
  for (const v of variants) {
    const last = groups[groups.length - 1]
    if (last && last.group === v.group) last.items.push(v)
    else groups.push({ group: v.group, items: [v] })
  }
  return groups
}

function VariantTile({
  label,
  price,
  promo,
  count,
  onChange,
}: {
  label: string
  price: number
  promo?: boolean
  count: number
  onChange: (n: number) => void
}) {
  const active = count > 0
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border-2 transition-colors',
        active ? 'border-primary bg-primary/10' : 'border-input bg-background',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(count + 1)}
        className="flex flex-1 flex-col items-center gap-1 px-3 pb-2 pt-3 text-center hover:bg-accent/60"
      >
        {promo && <Badge variant="warning">Promo</Badge>}
        <span className="text-base font-800 leading-tight">{label}</span>
        <span className="text-sm font-600 text-muted-foreground">
          {formatCurrency(price)}
        </span>
      </button>
      <div className="flex items-center justify-between gap-1 border-t border-border/60 p-2">
        <button
          type="button"
          onClick={() => onChange(count - 1)}
          disabled={!active}
          aria-label={`Quitar uno: ${label}`}
          className="flex size-12 items-center justify-center rounded-lg border-2 border-input bg-background text-2xl font-800 leading-none disabled:opacity-30"
        >
          −
        </button>
        <input
          inputMode="numeric"
          autoComplete="off"
          aria-label={`Cantidad: ${label}`}
          value={count === 0 ? '' : String(count)}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-full min-w-0 rounded-lg border-2 border-transparent bg-transparent text-center font-display text-2xl font-900 focus-visible:border-ring focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(count + 1)}
          aria-label={`Agregar uno: ${label}`}
          className="flex size-12 items-center justify-center rounded-lg border-2 border-primary bg-primary text-2xl font-800 leading-none text-primary-foreground"
        >
          +
        </button>
      </div>
    </div>
  )
}
