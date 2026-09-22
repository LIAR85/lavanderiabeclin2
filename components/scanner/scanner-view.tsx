'use client'

import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, CheckCircle2, Loader2, ScanLine, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/format'
import { useDeliverByFolio } from '@/lib/hooks'
import type { OrderWithClient } from '@/lib/types'

export function ScannerView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [result, setResult] = useState<
    { ok: true; order: OrderWithClient } | { ok: false; folio: string } | null
  >(null)
  const deliver = useDeliverByFolio()
  const processingRef = useRef(false)

  useEffect(() => {
    return () => controlsRef.current?.stop()
  }, [])

  async function startScan() {
    setResult(null)
    setScanning(true)
    processingRef.current = false
    try {
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (res) => {
          if (res && !processingRef.current) {
            processingRef.current = true
            handleFolio(res.getText())
          }
        },
      )
      controlsRef.current = controls
    } catch (err) {
      console.error('[v0] scanner error', err)
      toast.error('No se pudo acceder a la cámara. Usa la entrada manual.')
      setScanning(false)
    }
  }

  function stopScan() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
  }

  async function handleFolio(folio: string) {
    stopScan()
    try {
      const order = await deliver.mutateAsync(folio)
      if (order) {
        setResult({ ok: true, order })
        toast.success(`Entregada ${order.order_number}`)
      } else {
        setResult({ ok: false, folio })
        toast.error('Folio no encontrado')
      }
    } catch {
      toast.error('Error al procesar la entrega')
    }
  }

  function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (manual.trim()) {
      handleFolio(manual.trim())
      setManual('')
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-foreground/90">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="size-full object-cover"
              playsInline
              muted
            />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-background">
                <ScanLine className="size-12 opacity-70" />
                <p className="px-6 text-center text-sm opacity-80">
                  Apunta la cámara al código QR del ticket
                </p>
              </div>
            )}
            {scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="size-48 rounded-2xl border-4 border-brand-yellow/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}
          </div>

          {scanning ? (
            <Button variant="outline" onClick={stopScan} className="h-12">
              Detener cámara
            </Button>
          ) : (
            <Button onClick={startScan} className="h-12 text-base font-800">
              <Camera className="size-5" /> Escanear QR
            </Button>
          )}

          <form onSubmit={handleManual} className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="O captura el folio (ORD-…)"
            />
            <Button type="submit" variant="secondary" disabled={deliver.isPending}>
              {deliver.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Buscar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result?.ok && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <CheckCircle2 className="size-12 text-success" />
            <p className="font-display text-xl font-900">{result.order.order_number}</p>
            <p className="font-600">{result.order.client.name}</p>
            <p className="text-sm text-muted-foreground">
              Entregada correctamente
            </p>
            <p className="mt-1 font-display text-lg font-800 text-primary">
              {formatCurrency(result.order.charged_total ?? result.order.total)}
            </p>
            {result.order.payment_status !== 'paid' && (
              <p className="text-sm font-700 text-warning-foreground">
                Recuerda cobrar {formatCurrency(result.order.total)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {result && !result.ok && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <XCircle className="size-12 text-destructive" />
            <p className="font-display text-lg font-800">Folio no encontrado</p>
            <p className="text-sm text-muted-foreground">{result.folio}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
