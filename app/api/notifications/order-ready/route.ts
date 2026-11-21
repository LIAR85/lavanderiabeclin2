import { NextResponse } from 'next/server'
import {
  normalizeMexicanPhoneForWhatsApp,
  sendWhatsAppTemplateMessage,
} from '@/lib/notifications/whatsapp-cloud'
import { createAdminClient } from '@/lib/supabase/admin'

interface OrderReadyPayload {
  orderId?: string
}

type DeliveryStatus =
  | 'sent'
  | 'failed'
  | 'skipped_duplicate'
  | 'blocked_limit'
  | 'invalid_phone'

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME
const WHATSAPP_TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'es_MX'
const WHATSAPP_DISABLED = process.env.WHATSAPP_DISABLED === 'true'
const WHATSAPP_MONTHLY_LIMIT = Number(process.env.WHATSAPP_MONTHLY_LIMIT ?? '400')

function getMonthlyLimit() {
  if (!Number.isFinite(WHATSAPP_MONTHLY_LIMIT) || WHATSAPP_MONTHLY_LIMIT <= 0) {
    return 400
  }
  return Math.floor(WHATSAPP_MONTHLY_LIMIT)
}

async function logAttempt(params: {
  orderId: string
  recipientPhone: string
  recipientE164: string | null
  templateName: string
  templateLanguage: string
  deliveryStatus: DeliveryStatus
  providerMessageId?: string | null
  providerError?: string | null
  providerResponse?: unknown
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('order_notification_attempts').insert({
    order_id: params.orderId,
    notification_event: 'order_ready',
    channel: 'whatsapp',
    recipient_phone: params.recipientPhone,
    recipient_e164: params.recipientE164,
    template_name: params.templateName,
    template_language: params.templateLanguage,
    delivery_status: params.deliveryStatus,
    provider_message_id: params.providerMessageId ?? null,
    provider_error: params.providerError ?? null,
    provider_response: params.providerResponse ?? null,
  })
  if (error) {
    throw new Error(`No se pudo guardar el log de notificación: ${error.message}`)
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as OrderReadyPayload | null
  if (!body?.orderId) {
    return NextResponse.json(
      { error: 'Falta orderId para enviar la notificación de orden lista.' },
      { status: 400 },
    )
  }

  if (WHATSAPP_DISABLED) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'WHATSAPP_DISABLED' })
  }

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TEMPLATE_NAME) {
    return NextResponse.json(
      {
        error:
          'Faltan variables WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_TEMPLATE_NAME.',
      },
      { status: 500 },
    )
  }

  const supabase = createAdminClient()

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, status, client:clients(name, phone)')
    .eq('id', body.orderId)
    .maybeSingle()

  if (orderError) {
    return NextResponse.json(
      { error: 'No se pudo consultar la orden para notificar por WhatsApp.', detail: orderError.message },
      { status: 500 },
    )
  }

  if (!orderData) {
    return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 })
  }

  if (orderData.status !== 'ready') {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: 'ORDER_NOT_READY',
      },
      { status: 200 },
    )
  }

  const clientData = orderData.client as { name?: string; phone?: string } | null
  const rawClientPhone = clientData?.phone?.trim() ?? ''

  if (!rawClientPhone) {
    await logAttempt({
      orderId: orderData.id,
      recipientPhone: '',
      recipientE164: null,
      templateName: WHATSAPP_TEMPLATE_NAME,
      templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE,
      deliveryStatus: 'invalid_phone',
      providerError: 'El cliente no tiene teléfono registrado.',
    })
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'MISSING_PHONE' },
      { status: 200 },
    )
  }

  const normalized = normalizeMexicanPhoneForWhatsApp(rawClientPhone)
  if (!normalized) {
    await logAttempt({
      orderId: orderData.id,
      recipientPhone: rawClientPhone,
      recipientE164: null,
      templateName: WHATSAPP_TEMPLATE_NAME,
      templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE,
      deliveryStatus: 'invalid_phone',
      providerError: 'Teléfono inválido para WhatsApp en México.',
    })
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'INVALID_PHONE' },
      { status: 200 },
    )
  }

  const { data: existingSent, error: existingError } = await supabase
    .from('order_notification_attempts')
    .select('id')
    .eq('order_id', orderData.id)
    .eq('notification_event', 'order_ready')
    .eq('channel', 'whatsapp')
    .eq('delivery_status', 'sent')
    .limit(1)

  if (existingError) {
    return NextResponse.json(
      { error: 'No se pudo validar notificaciones previas.', detail: existingError.message },
      { status: 500 },
    )
  }

  if ((existingSent ?? []).length > 0) {
    await logAttempt({
      orderId: orderData.id,
      recipientPhone: rawClientPhone,
      recipientE164: normalized.e164,
      templateName: WHATSAPP_TEMPLATE_NAME,
      templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE,
      deliveryStatus: 'skipped_duplicate',
      providerError: 'Notificación ya enviada previamente para este estado.',
    })
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'DUPLICATE_ALREADY_SENT' },
      { status: 200 },
    )
  }

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const nextMonthStart = new Date(monthStart)
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1)

  const { count: sentCount, error: countError } = await supabase
    .from('order_notification_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('channel', 'whatsapp')
    .eq('delivery_status', 'sent')
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', nextMonthStart.toISOString())

  if (countError) {
    return NextResponse.json(
      { error: 'No se pudo validar el límite mensual de notificaciones.', detail: countError.message },
      { status: 500 },
    )
  }

  const limit = getMonthlyLimit()
  if ((sentCount ?? 0) >= limit) {
    await logAttempt({
      orderId: orderData.id,
      recipientPhone: rawClientPhone,
      recipientE164: normalized.e164,
      templateName: WHATSAPP_TEMPLATE_NAME,
      templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE,
      deliveryStatus: 'blocked_limit',
      providerError: `Límite mensual alcanzado (${limit}).`,
    })
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: 'MONTHLY_LIMIT_REACHED',
        limit,
      },
      { status: 200 },
    )
  }

  const sendResult = await sendWhatsAppTemplateMessage({
    accessToken: WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
    to: normalized.waRecipient,
    templateName: WHATSAPP_TEMPLATE_NAME,
    templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE,
    parameters: [
      { type: 'text', text: clientData?.name?.trim() || 'cliente' },
      { type: 'text', text: orderData.order_number },
    ],
  })

  if (!sendResult.ok) {
    await logAttempt({
      orderId: orderData.id,
      recipientPhone: rawClientPhone,
      recipientE164: normalized.e164,
      templateName: WHATSAPP_TEMPLATE_NAME,
      templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE,
      deliveryStatus: 'failed',
      providerError: sendResult.errorMessage ?? 'Error desconocido en envío de WhatsApp.',
      providerResponse: sendResult.responseBody ?? null,
    })
    return NextResponse.json(
      {
        error: 'Meta WhatsApp API rechazó el envío.',
        detail: sendResult.errorMessage,
      },
      { status: 502 },
    )
  }

  await logAttempt({
    orderId: orderData.id,
    recipientPhone: rawClientPhone,
    recipientE164: normalized.e164,
    templateName: WHATSAPP_TEMPLATE_NAME,
    templateLanguage: WHATSAPP_TEMPLATE_LANGUAGE,
    deliveryStatus: 'sent',
    providerMessageId: sendResult.messageId ?? null,
    providerResponse: sendResult.responseBody ?? null,
  })

  return NextResponse.json({
    ok: true,
    channel: 'whatsapp',
    messageId: sendResult.messageId ?? null,
  })
}
