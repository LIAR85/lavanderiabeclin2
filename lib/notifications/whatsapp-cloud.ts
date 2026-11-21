export interface WhatsAppTemplateParameter {
  type: 'text'
  text: string
}

export interface SendWhatsAppTemplateMessageParams {
  accessToken: string
  phoneNumberId: string
  to: string
  templateName: string
  templateLanguage: string
  parameters: WhatsAppTemplateParameter[]
}

export interface WhatsAppCloudResult {
  ok: boolean
  status: number
  messageId?: string
  errorMessage?: string
  responseBody?: unknown
}

interface WhatsAppCloudSuccessResponse {
  messages?: Array<{ id?: string }>
}

interface WhatsAppCloudErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

const META_GRAPH_VERSION = 'v21.0'

export function normalizeMexicanPhoneForWhatsApp(rawPhone: string): {
  e164: string
  waRecipient: string
} | null {
  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return null

  let local10: string | null = null
  if (digits.length === 10) {
    local10 = digits
  } else if (digits.length === 12 && digits.startsWith('52')) {
    local10 = digits.slice(2)
  } else if (digits.length === 13 && digits.startsWith('521')) {
    local10 = digits.slice(3)
  }

  if (!local10 || local10.length !== 10) return null

  return {
    e164: `+52${local10}`,
    waRecipient: `52${local10}`,
  }
}

export async function sendWhatsAppTemplateMessage(
  params: SendWhatsAppTemplateMessageParams,
): Promise<WhatsAppCloudResult> {
  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${params.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'template',
        template: {
          name: params.templateName,
          language: {
            code: params.templateLanguage,
          },
          components: [
            {
              type: 'body',
              parameters: params.parameters,
            },
          ],
        },
      }),
    },
  )

  const responseBody = (await response.json().catch(() => null)) as
    | WhatsAppCloudSuccessResponse
    | WhatsAppCloudErrorResponse
    | null

  if (!response.ok) {
    const errorMessage =
      (responseBody as WhatsAppCloudErrorResponse | null)?.error?.message ??
      `Meta WhatsApp API devolvió ${response.status}.`

    return {
      ok: false,
      status: response.status,
      errorMessage,
      responseBody,
    }
  }

  const messageId = (responseBody as WhatsAppCloudSuccessResponse | null)?.messages?.[0]?.id
  if (!messageId) {
    return {
      ok: false,
      status: response.status,
      errorMessage: 'Meta respondió sin identificador de mensaje.',
      responseBody,
    }
  }

  return {
    ok: true,
    status: response.status,
    messageId,
    responseBody,
  }
}
