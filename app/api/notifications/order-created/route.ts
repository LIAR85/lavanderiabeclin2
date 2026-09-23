import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { SERVICE_LABELS } from '@/lib/config'
import type { ServiceType } from '@/lib/types'

const BUSINESS_EMAIL = 'lavanderiabeclin@gmail.com'

interface OrderCreatedPayload {
  orderNumber?: string
  clientName?: string
  clientEmail?: string
  serviceType?: ServiceType
  total?: number
  promisedDateIso?: string
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: 'Faltan variables RESEND_API_KEY o RESEND_FROM_EMAIL.' },
      { status: 500 },
    )
  }

  const resend = new Resend(apiKey)

  const body = (await request.json().catch(() => null)) as OrderCreatedPayload | null

  if (!body?.orderNumber || !body.clientName || !body.serviceType || typeof body.total !== 'number') {
    return NextResponse.json({ error: 'Datos incompletos para enviar correo.' }, { status: 400 })
  }

  const recipients = [BUSINESS_EMAIL]
  if (body.clientEmail) {
    recipients.push(body.clientEmail)
  }

  const serviceLabel = SERVICE_LABELS[body.serviceType] ?? body.serviceType
  const promisedDate = body.promisedDateIso ? formatDate(body.promisedDateIso) : 'Sin fecha'
  const total = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(body.total)

  const subject = `Orden creada ${body.orderNumber}`
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #1d2747; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Nueva orden registrada</h2>
      <p style="margin: 0 0 8px;"><strong>Folio:</strong> ${body.orderNumber}</p>
      <p style="margin: 0 0 8px;"><strong>Cliente:</strong> ${body.clientName}</p>
      <p style="margin: 0 0 8px;"><strong>Servicio:</strong> ${serviceLabel}</p>
      <p style="margin: 0 0 8px;"><strong>Total:</strong> ${total}</p>
      <p style="margin: 0 0 8px;"><strong>Entrega estimada:</strong> ${promisedDate}</p>
      <p style="margin-top: 16px;">Gracias por confiar en beclin.</p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject,
    html,
  })

  if (error) {
    return NextResponse.json({ error: 'Resend rechazo el envio.', detail: error.message }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
