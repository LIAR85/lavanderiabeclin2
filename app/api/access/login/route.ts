import { NextResponse } from 'next/server'

const TEMP_PASSWORD = 'admin123'
const ACCESS_COOKIE = 'beclin_access'
const ACCESS_GRANTED = 'granted'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null

  if (!body?.password || body.password !== TEMP_PASSWORD) {
    return NextResponse.json({ error: 'Contrasena incorrecta.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: ACCESS_COOKIE,
    value: ACCESS_GRANTED,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })

  return response
}
