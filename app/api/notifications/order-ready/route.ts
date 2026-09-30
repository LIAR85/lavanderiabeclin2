import { NextResponse } from 'next/server'
import { Resend } from 'resend'

interface OrderReadyPayload {
  orderNumber?: string
  clientName?: string
  clientEmail?: string
}

const REPLY_TO_EMAIL =
  process.env.REPLY_TO_EMAIL ?? process.env.BUSINESS_EMAIL ?? 'beclinlavanderia@gmail.com'
const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? 'Sin telefono configurado'
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS ?? 'Sin direccion configurada'
const RESEND_DISABLED = process.env.RESEND_DISABLED === 'true'

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

  const body = (await request.json().catch(() => null)) as OrderReadyPayload | null
  if (!body?.orderNumber || !body.clientName || !body.clientEmail) {
    return NextResponse.json(
      { error: 'Datos incompletos para enviar correo de orden lista.' },
      { status: 400 },
    )
  }

  const resend = new Resend(apiKey)
  const subject = `Tu pedido ${body.orderNumber} está listo para recoger`
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb; margin:0; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e4e9f2;">
            <tr>
              <td style="padding:24px 24px 0; font-family:Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px; overflow:hidden; background:linear-gradient(135deg,#15803d,#16a34a); color:#ffffff;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <div style="font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; opacity:0.85;">Pedido listo</div>
                      <div style="font-size:20px; font-weight:800; line-height:1.3; margin-top:4px;">Tu pedido está listo</div>
                      <div style="font-size:14px; margin-top:6px; opacity:0.95;">Folio ${body.orderNumber}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px; font-family:Arial,sans-serif; color:#1f2a44;">
                <p style="margin:0 0 6px; font-size:14px; line-height:1.5;">Hola <strong>${body.clientName}</strong>,</p>
                <p style="margin:0 0 14px; font-size:14px; line-height:1.5;">Tu pedido con folio <strong>${body.orderNumber}</strong> fue terminado y ya está listo para recoger.</p>
                <div style="background:#ecfdf3; border:1px solid #bbf7d0; border-radius:12px; padding:12px 14px; margin-bottom:14px;">
                  <div style="font-size:12px; font-weight:700; color:#166534; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px;">Horario de entrega</div>
                  <div style="font-size:14px; color:#14532d;">Lunes a viernes: 8:00 a 18:00</div>
                  <div style="font-size:14px; color:#14532d; margin-top:2px;">Sábados: 8:00 a 15:00</div>
                </div>
                <p style="margin:0; font-size:14px; line-height:1.5;">Gracias por confiar en be clin.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px; font-family:Arial,sans-serif;">
                <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px 14px;">
                  <div style="font-size:12px; font-weight:700; color:#9a3412; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Política de resguardo</div>
                  <div style="font-size:13px; color:#7c2d12; line-height:1.5;">Contamos con un plazo de 30 días naturales a partir de hoy para que recojas tus prendas. Transcurrido este plazo, Be Clin Lavandería no se hace responsable de las prendas no reclamadas.</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 22px; font-family:Arial,sans-serif; color:#7a869a; font-size:12px; text-align:center; border-top:1px solid #eef2f7; line-height:1.6;">
                Si respondes este correo, te atenderemos a la brevedad.<br/>
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
    to: [body.clientEmail],
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
