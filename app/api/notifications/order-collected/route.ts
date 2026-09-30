import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL ?? 'beclinlavanderia@gmail.com'
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL ?? BUSINESS_EMAIL
const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? 'Sin telefono configurado'
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS ?? 'Sin direccion configurada'
const RESEND_DISABLED = process.env.RESEND_DISABLED === 'true'
const OWNER_EMAIL_DISABLED = process.env.OWNER_EMAIL_DISABLED === 'true'

interface OrderCollectedPayload {
  orderNumber?: string
  clientName?: string
  chargedTotal?: number
  originalTotal?: number
  paymentOverridden?: boolean
  overrideNote?: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value)
}

export async function POST(request: Request) {
  if (RESEND_DISABLED || OWNER_EMAIL_DISABLED) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: RESEND_DISABLED ? 'RESEND_DISABLED' : 'OWNER_EMAIL_DISABLED',
    })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: 'Faltan variables RESEND_API_KEY o RESEND_FROM_EMAIL.' },
      { status: 500 },
    )
  }

  const body = (await request.json().catch(() => null)) as OrderCollectedPayload | null
  if (
    !body?.orderNumber ||
    !body.clientName ||
    typeof body.chargedTotal !== 'number' ||
    typeof body.originalTotal !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Datos incompletos para enviar correo de cobro.' },
      { status: 400 },
    )
  }

  const resend = new Resend(apiKey)
  const subject = `Orden cobrada y finalizada ${body.orderNumber}`
  const charged = formatCurrency(body.chargedTotal)
  const original = formatCurrency(body.originalTotal)
  const adjusted = body.paymentOverridden ? 'Si' : 'No'

  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb; margin:0; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e4e9f2;">
            <tr>
              <td style="padding:24px 24px 0; font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px; overflow:hidden; background:linear-gradient(135deg,#0f172a,#1e293b); color:#ffffff;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; opacity:0.85;">Orden finalizada</div>
                      <div style="font-size:20px; font-weight:800; line-height:1.3; margin-top:4px;">Orden cobrada y finalizada</div>
                      <div style="font-size:14px; margin-top:6px; opacity:0.95;">Folio ${body.orderNumber}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px; font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e9f2; border-radius:14px; overflow:hidden; background:#f9fafb;">
                  <tr>
                    <td style="padding:11px 16px; font-size:13px; color:#667085; border-bottom:1px solid #eef2f7;">Cliente</td>
                    <td style="padding:11px 16px; text-align:right; font-size:14px; font-weight:600; color:#1f2a44; border-bottom:1px solid #eef2f7;">${body.clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding:11px 16px; font-size:13px; color:#667085; border-bottom:1px solid #eef2f7;">Total original</td>
                    <td style="padding:11px 16px; text-align:right; font-size:14px; font-weight:600; color:#1f2a44; border-bottom:1px solid #eef2f7;">${original}</td>
                  </tr>
                  <tr>
                    <td style="padding:11px 16px; font-size:13px; color:#667085; border-bottom:1px solid #eef2f7;">Cobro ajustado</td>
                    <td style="padding:11px 16px; text-align:right; font-size:14px; font-weight:600; color:#1f2a44; border-bottom:1px solid #eef2f7;">${adjusted}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px; font-size:15px; font-weight:700; color:#0f172a; background:#eef2f7;">Total cobrado</td>
                    <td style="padding:14px 16px; text-align:right; font-size:22px; font-weight:800; color:#0f172a; background:#eef2f7;">${charged}</td>
                  </tr>
                </table>
                ${body.paymentOverridden && body.overrideNote ? `<div style="margin-top:12px; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; border-radius:10px; padding:10px 12px; font-size:13px; line-height:1.5;"><strong>Motivo del ajuste:</strong> ${body.overrideNote}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 22px; font-family:Arial,sans-serif; color:#7a869a; font-size:12px; text-align:center; border-top:1px solid #eef2f7; line-height:1.6;">
                Este aviso fue enviado automáticamente por el sistema Be Clin.<br/>
                Teléfono: ${BUSINESS_PHONE} · Dirección: ${BUSINESS_ADDRESS}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [BUSINESS_EMAIL],
    replyTo: REPLY_TO_EMAIL,
    subject,
    html,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Resend rechazo el envio.', detail: error.message },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, emailId: data?.id ?? null })
}
