# beclin

## Notificaciones automáticas de pedidos

El endpoint [`order-created/route.ts`](./app/api/notifications/order-created/route.ts) puede enviar:

- **Correo** por Resend

### Reglas de captura de órdenes

- Al crear una orden se solicita confirmación de:
  - **Pago parcial** (abono manual y cálculo de saldo pendiente).
  - **Fecha específica de entrega**.
- Si **no** se marca fecha específica, internamente se agenda a **3 días** y la fecha:
  - **No** se imprime en el ticket.
  - **No** se incluye en el correo de confirmación.
- En el módulo administrativo existe la pestaña **Órdenes antiguas** para cargar pedidos
  previos a la implementación, preservando fecha histórica, estado, abono y saldo.

Cuando una orden cambia a estado **LISTA**, el endpoint
[`order-ready/route.ts`](./app/api/notifications/order-ready/route.ts) envía una
notificación automática por **WhatsApp Cloud API (Meta)** usando plantilla aprobada.

### Variables de entorno

Correo (Resend):

- `RESEND_DISABLED` (`true` para desactivar correos)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `BUSINESS_EMAIL`
- `REPLY_TO_EMAIL`

WhatsApp Cloud API (Meta):

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_TEMPLATE_LANGUAGE` (ej. `es_MX`)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`

Control de límite mensual:

- `WHATSAPP_MONTHLY_LIMIT` (opcional, por defecto `400`)
- `WHATSAPP_DISABLED` (opcional, `true` para desactivar envíos)

Opcionales para el contenido:

- `BUSINESS_PHONE`
- `BUSINESS_ADDRESS`

### Comportamiento (WhatsApp)

- El envío es automático al pasar la orden a **LISTA**.
- Se evita envío duplicado para la misma orden/estado si ya existe un envío exitoso.
- Cada intento se registra en `order_notification_attempts` (éxito, fallo, límite, duplicado, teléfono inválido).
- Si falla WhatsApp, la orden permanece guardada y se muestra advertencia en UI.
- El teléfono del cliente se normaliza para México (10 dígitos, `52...` para Meta).
- El límite mensual por cantidad de mensajes **no garantiza** el gasto real facturado por Meta;
  solo ayuda a frenar volumen antes de superar el presupuesto estimado.
