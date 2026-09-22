export function formatCurrency(value: number | null | undefined): string {
  const n = typeof value === 'number' ? value : 0
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/** Hours elapsed since a timestamp. */
export function hoursSince(value: string | Date): number {
  const d = typeof value === 'string' ? new Date(value) : value
  return (Date.now() - d.getTime()) / 36e5
}

export function relativeAge(value: string | Date): string {
  const hrs = hoursSince(value)
  if (hrs < 1) return `${Math.max(1, Math.round(hrs * 60))} min`
  if (hrs < 24) return `${Math.round(hrs)} h`
  return `${Math.round(hrs / 24)} d`
}

export function isOverdue(value: string | Date | null | undefined): boolean {
  if (!value) return false
  const d = typeof value === 'string' ? new Date(value) : value
  return d.getTime() < Date.now()
}

/** Signed relative time, e.g. "en 3 h", "hace 2 d". */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  const diffMs = d.getTime() - Date.now()
  const past = diffMs < 0
  const mins = Math.abs(diffMs) / 6e4
  let label: string
  if (mins < 60) label = `${Math.max(1, Math.round(mins))} min`
  else if (mins < 1440) label = `${Math.round(mins / 60)} h`
  else label = `${Math.round(mins / 1440)} d`
  return past ? `hace ${label}` : `en ${label}`
}
