import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { SERVICE_LABELS } from '@/lib/config'
import type { ServiceType } from '@/lib/types'

const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL ?? 'beclinlavanderia@gmail.com'
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL ?? BUSINESS_EMAIL
const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? 'Sin telefono configurado'
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS ?? 'Sin direccion configurada'
const RESEND_DISABLED = process.env.RESEND_DISABLED === 'true'
const OWNER_EMAIL_DISABLED = process.env.OWNER_EMAIL_DISABLED === 'true'

interface OrderCreatedPayload {
  orderNumber?: string
  clientName?: string
  clientEmail?: string
  serviceType?: ServiceType
  pieceCount?: number
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
  if (RESEND_DISABLED) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'RESEND_DISABLED' })
  }

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

  const recipients: string[] = []
  if (!OWNER_EMAIL_DISABLED) {
    recipients.push(BUSINESS_EMAIL)
  }
  if (body.clientEmail) {
    recipients.push(body.clientEmail)
  }

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'NO_RECIPIENTS' })
  }

  const serviceLabel = SERVICE_LABELS[body.serviceType] ?? body.serviceType
  const promisedDate = body.promisedDateIso ? formatDate(body.promisedDateIso) : 'Sin fecha'
  const total = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(body.total)
  const pieceCount =
    typeof body.pieceCount === 'number' && Number.isFinite(body.pieceCount)
      ? Math.max(1, Math.floor(body.pieceCount))
      : null

  const subject = `Orden creada ${body.orderNumber}`
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8ff; margin:0; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #dbe8ff;">
            <tr>
              <td style="padding:24px 24px 0; font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px; overflow:hidden; background:linear-gradient(135deg,#1d4ed8,#3b82f6); color:#ffffff;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; opacity:0.85;">Orden registrada</div>
                      <div style="font-size:20px; font-weight:800; line-height:1.3; margin-top:4px;">Tu orden fue recibida con éxito</div>
                      <div style="font-size:14px; margin-top:6px; opacity:0.95;">Gracias por confiar en Be Clin Lavandería.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px; font-family:Arial,sans-serif; color:#334155;">
                <p style="margin:0 0 6px; font-size:14px; line-height:1.5;">Hola <strong>${body.clientName}</strong>,</p>
                <p style="margin:0 0 6px; font-size:14px; line-height:1.5;">Hemos registrado tu orden en nuestro sistema de lavandería. Te notificaremos cuando esté lista para que puedas pasar a recogerla.</p>
                <p style="margin:0; font-size:14px; line-height:1.5;">Gracias por dejarnos cuidar tus prendas.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px; font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9e9ff; border-radius:14px; overflow:hidden; background:#f9fcff;">
                  <tr>
                    <td colspan="2" style="padding:14px 16px; background:#eff6ff; border-bottom:1px solid #d9e9ff;">
                      <div style="font-size:16px; font-weight:700; color:#1d4ed8;">Resumen de tu orden</div>
                      <div style="font-size:13px; color:#64748b; margin-top:2px;">Folio: <strong style="color:#1d4ed8;">${body.orderNumber}</strong></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:11px 16px; font-size:13px; color:#64748b; border-bottom:1px solid #e6f0ff;">Cliente</td>
                    <td style="padding:11px 16px; text-align:right; font-size:14px; font-weight:600; color:#1f2a44; border-bottom:1px solid #e6f0ff;">${body.clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding:11px 16px; font-size:13px; color:#64748b; border-bottom:1px solid #e6f0ff;">Servicio</td>
                    <td style="padding:11px 16px; text-align:right; font-size:14px; font-weight:600; color:#1f2a44; border-bottom:1px solid #e6f0ff;">${serviceLabel}</td>
                  </tr>
                  ${pieceCount && pieceCount > 1 ? `<tr>
                    <td style="padding:11px 16px; font-size:13px; color:#64748b; border-bottom:1px solid #e6f0ff;">Piezas recibidas</td>
                    <td style="padding:11px 16px; text-align:right; font-size:14px; font-weight:600; color:#1f2a44; border-bottom:1px solid #e6f0ff;">${pieceCount}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:11px 16px; font-size:13px; color:#64748b;">Entrega estimada</td>
                    <td style="padding:11px 16px; text-align:right; font-size:14px; font-weight:600; color:#1f2a44;">${promisedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px; font-size:15px; font-weight:700; color:#0f172a; background:#eff6ff; border-top:1px solid #d9e9ff;">Total</td>
                    <td style="padding:14px 16px; text-align:right; font-size:22px; font-weight:800; color:#1d4ed8; background:#eff6ff; border-top:1px solid #d9e9ff;">${total}</td>
                  </tr>
                </table>
                <p style="margin:10px 0 0; font-size:11px; color:#94a3b8; line-height:1.5;">* El precio final puede variar ante cambios en el servicio, prendas adicionales u otros imprevistos detectados durante el proceso.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0; font-family:Arial,sans-serif;">
                <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px 14px;">
                  <div style="font-size:12px; font-weight:700; color:#9a3412; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Política de resguardo</div>
                  <div style="font-size:13px; color:#7c2d12; line-height:1.5;">Contamos con un plazo de 30 días naturales a partir de la fecha de entrega estimada para que recojas tus prendas. Transcurrido este plazo, Be Clin Lavandería no se hace responsable de las prendas no reclamadas.</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px; background:#eef5ff; border:1px solid #dbeafe;">
                  <tr>
                    <td style="padding:12px 10px; text-align:center; font-family:Arial,sans-serif; width:33.33%;">
                      <div style="font-size:13px; font-weight:700; color:#1e3a8a;">Cuidado profesional</div>
                      <div style="font-size:11px; color:#475569; margin-top:2px;">Tus prendas en manos expertas</div>
                    </td>
                    <td style="padding:12px 10px; text-align:center; font-family:Arial,sans-serif; width:33.33%; border-left:1px solid #dbeafe; border-right:1px solid #dbeafe;">
                      <div style="font-size:13px; font-weight:700; color:#1e3a8a;">Limpieza con confianza</div>
                      <div style="font-size:11px; color:#475569; margin-top:2px;">Resultados que se notan</div>
                    </td>
                    <td style="padding:12px 10px; text-align:center; font-family:Arial,sans-serif; width:33.33%;">
                      <div style="font-size:13px; font-weight:700; color:#1e3a8a;">Tu tiempo nos importa</div>
                      <div style="font-size:11px; color:#475569; margin-top:2px;">Puntualidad en cada entrega</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 22px; font-family:Arial,sans-serif; color:#7a869a; font-size:12px; text-align:center; border-top:1px solid #eef2f7; line-height:1.6;">
                Este correo fue generado automáticamente por el sistema de Be Clin Lavandería.<br/>
                Teléfono: ${BUSINESS_PHONE} · Dirección: ${BUSINESS_ADDRESS}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    replyTo: REPLY_TO_EMAIL,
    subject,
    html,
  })

  if (error) {
    return NextResponse.json(
      {
        error: 'Resend rechazo el envio.',
        detail:
          error.message ||
          'Verifica RESEND_API_KEY, RESEND_FROM_EMAIL y que el dominio del remitente este verificado en Resend.',
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}
