'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Plus, Search, Trash2, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  BAG_LABELS,
  INSTRUCTION_PRESETS,
  MODE_LABELS,
  SERVICE_LABELS,
  SERVICE_ORDER,
  SPECIAL_ITEMS_CATALOG,
} from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import { getSettings } from '@/lib/local-store'
import { enqueueOrder } from '@/lib/offline-queue'
import { computePrice, computePromisedDate } from '@/lib/pricing'
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

const BAG_OPTIONS: BagSize[] = ['quarter', 'half', 'threequarter', 'full', 'custom']

export function NewOrderForm({
  online,
  onCreated,
}: {
  online: boolean
  onCreated: (order: OrderWithClient, offline: boolean) => void
}) {
  const qc = useQueryClient()
  const settings = useMemo(() => getSettings(), [])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lookupState, setLookupState] = useState<'idle' | 'searching' | 'found' | 'new'>(
    'idle',
  )

  const [serviceType, setServiceType] = useState<ServiceType>('lavado')
  const [mode, setMode] = useState<ServiceMode>('regular')
  const [bagSize, setBagSize] = useState<BagSize>('full')
  const [customFactor, setCustomFactor] = useState('1')
  const [quantity, setQuantity] = useState('1')
  const [pieceCount, setPieceCount] = useState('')

  const [specialItems, setSpecialItems] = useState<SpecialItemInput[]>([])
  const [instructions, setInstructions] = useState<string[]>([])
  const [freeInstruction, setFreeInstruction] = useState('')
  const [paymentTiming, setPaymentTiming] = useState<'on_receipt' | 'on_delivery'>(
    'on_delivery',
  )
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Phone lookup (debounced)
  useEffect(() => {
    const clean = phone.trim()
    if (clean.length < 7 || !online) {
      setLookupState('idle')
      return
    }
    setLookupState('searching')
    const t = setTimeout(async () => {
      try {
        const client = await findClientByPhone(clean)
        if (client) {
          setName(client.name)
          setEmail(client.email ?? '')
          setLookupState('found')
        } else {
          setLookupState('new')
        }
      } catch {
        setLookupState('idle')
      }
    }, 450)
    return () => clearTimeout(t)
  }, [phone, online])

  const price = useMemo(
    () =>
      computePrice({
        settings,
        serviceType,
        serviceMode: mode,
        bagSize,
        quantity: Number(quantity) || 1,
        customBagFactor: Number(customFactor) || 1,
        specialItems,
      }),
    [settings, serviceType, mode, bagSize, quantity, customFactor, specialItems],
  )

  const promisedDate = useMemo(
    () => computePromisedDate(settings, mode),
    [settings, mode],
  )

  function addSpecialItem(name: string, unit_price: number) {
    setSpecialItems((prev) => {
      const existing = prev.find((i) => i.name === name)
      if (existing) {
        return prev.map((i) =>
          i.name === name ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, { name, quantity: 1, unit_price }]
    })
  }

  function updateItemQty(name: string, delta: number) {
    setSpecialItems((prev) =>
      prev
        .map((i) => (i.name === name ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    )
  }

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
    setBagSize('full')
    setCustomFactor('1')
    setQuantity('1')
    setPieceCount('')
    setSpecialItems([])
    setInstructions([])
    setFreeInstruction('')
    setPaymentTiming('on_delivery')
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || phone.trim().length < 7) {
      toast.error('Captura nombre y teléfono válido del cliente')
      return
    }
    const allInstructions = [
      ...instructions,
      ...(freeInstruction.trim() ? [freeInstruction.trim()] : []),
    ].join(' · ')

    const input: NewOrderInput = {
      client: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
      service_type: serviceType,
      service_mode: mode,
      bag_size: bagSize,
      custom_bag_factor: Number(customFactor) || 1,
      quantity: Number(quantity) || 1,
      estimated_piece_count: pieceCount ? Number(pieceCount) : undefined,
      special_items: specialItems,
      customer_instructions: allInstructions || undefined,
      notes: notes.trim() || undefined,
      payment_timing: paymentTiming,
      promised_date: promisedDate.toISOString(),
      subtotal: price.subtotal,
      extras_total: price.extrasTotal,
      total: price.total,
    }

    setSubmitting(true)
    try {
      if (online) {
        const order = await createOrder(input)
        qc.invalidateQueries({ queryKey: ['orders'] })
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
          service_type: serviceType,
          service_mode: mode,
          bag_size: bagSize,
          estimated_piece_count: pieceCount ? Number(pieceCount) : null,
          estimated_weight: null,
          quantity: Number(quantity) || 1,
          promised_date: promisedDate.toISOString(),
          subtotal: price.subtotal,
          extras_total: price.extrasTotal,
          total: price.total,
          status: 'received',
          visible_status: 'RECIBIDA',
          customer_instructions: allInstructions || null,
          payment_timing: paymentTiming,
          payment_status: paymentTiming === 'on_receipt' ? 'paid' : 'pending',
          charged_total: paymentTiming === 'on_receipt' ? price.total : null,
          price_overridden: false,
          price_override_note: null,
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
      console.error('[v0] createOrder error', err)
      toast.error('No se pudo crear la orden. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Input
                  id="phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10 dígitos"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {lookupState === 'searching' && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                  {lookupState === 'found' && (
                    <Check className="size-4 text-success" />
                  )}
                  {lookupState === 'idle' && (
                    <Search className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              {lookupState === 'found' && (
                <span className="text-xs font-600 text-success">
                  Cliente frecuente — datos autocompletados
                </span>
              )}
              {lookupState === 'new' && (
                <span className="text-xs text-muted-foreground">Cliente nuevo</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
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
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service">Tipo de servicio</Label>
                <Select
                  id="service"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                >
                  {SERVICE_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {SERVICE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Modalidad</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['regular', 'express'] as ServiceMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        'flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-700 transition-colors',
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

            <div className="flex flex-col gap-1.5">
              <Label>Tamaño de bolsa / carga</Label>
              <div className="flex flex-wrap gap-2">
                {BAG_OPTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBagSize(b)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-600 transition-colors',
                      bagSize === b
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-input bg-background text-foreground',
                    )}
                  >
                    {BAG_LABELS[b]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {bagSize === 'custom' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="factor">Factor personalizado</Label>
                  <Input
                    id="factor"
                    inputMode="decimal"
                    value={customFactor}
                    onChange={(e) => setCustomFactor(e.target.value)}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qty">Cantidad (cargas)</Label>
                <Input
                  id="qty"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pieces">Piezas estimadas (opcional)</Label>
                <Input
                  id="pieces"
                  inputMode="numeric"
                  value={pieceCount}
                  onChange={(e) => setPieceCount(e.target.value)}
                  placeholder="Ej. 24"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Special items */}
        <Card>
          <CardHeader>
            <CardTitle>Piezas especiales</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {SPECIAL_ITEMS_CATALOG.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => addSpecialItem(item.name, item.price)}
                  className="flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-sm font-600 transition-colors hover:border-primary hover:bg-accent"
                >
                  <Plus className="size-3.5" /> {item.name}
                  <span className="text-muted-foreground">
                    {formatCurrency(item.price)}
                  </span>
                </button>
              ))}
            </div>
            {specialItems.length > 0 && (
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {specialItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 p-2.5"
                  >
                    <span className="text-sm font-600">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(item.unit_price)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.name, -1)}
                          className="flex size-7 items-center justify-center rounded-md border border-input text-lg leading-none"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-700">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.name, 1)}
                          className="flex size-7 items-center justify-center rounded-md border border-input text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSpecialItems((prev) =>
                            prev.filter((i) => i.name !== item.name),
                          )
                        }
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Quitar ${item.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions & notes */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones del cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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
          </CardContent>
        </Card>
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
              <Row label="Bolsa" value={BAG_LABELS[bagSize]} />
              <Row label="Entrega estimada" value={formatDate(promisedDate)} />
            </div>

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

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full text-base font-800"
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>Crear orden · {formatCurrency(price.total)}</>
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
