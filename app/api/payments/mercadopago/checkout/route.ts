import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'

type CheckoutBody = {
  orderNumber?: string
  customerName?: string
  customerEmail?: string
  amount?: number
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody
    const orderNumber = body.orderNumber?.trim()
    const customerName = body.customerName?.trim()
    const customerEmail = body.customerEmail?.trim()
    const amount = Number(body.amount)

    if (!orderNumber || !customerName || !Number.isFinite(amount) || amount <= 0) {
      return Response.json(
        { error: 'Datos de cobro incompletos o inválidos' },
        { status: 400 },
      )
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!accessToken) {
      return Response.json(
        {
          error:
            'Falta MERCADO_PAGO_ACCESS_TOKEN en variables de entorno del servidor',
        },
        { status: 500 },
      )
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({
        items: [
          {
            title: `Orden ${orderNumber} - Lavanderia beClin`,
            quantity: 1,
            unit_price: Number(amount.toFixed(2)),
            currency_id: 'MXN',
          },
        ],
        payer: {
          name: customerName,
          email: customerEmail || undefined,
        },
        external_reference: orderNumber,
      }),
      cache: 'no-store',
    })

    const mpData = (await mpResponse.json()) as {
      id?: string
      init_point?: string
      sandbox_init_point?: string
      message?: string
      cause?: Array<{ description?: string }>
    }

    if (!mpResponse.ok || !mpData.init_point) {
      const cause = mpData.cause?.[0]?.description
      const errorMessage = cause || mpData.message || 'Mercado Pago no pudo crear el checkout'
      return Response.json({ error: errorMessage }, { status: 502 })
    }

    return Response.json({
      preferenceId: mpData.id,
      checkoutUrl: mpData.init_point,
      sandboxCheckoutUrl: mpData.sandbox_init_point,
    })
  } catch (error) {
    console.error('[mercadopago-checkout] error', error)
    return Response.json(
      { error: 'Error interno al crear checkout de Mercado Pago' },
      { status: 500 },
    )
  }
}
