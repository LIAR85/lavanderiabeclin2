import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ACCESS_COOKIE = 'beclin_access'
const ACCESS_GRANTED = 'granted'

export function middleware(request: NextRequest) {
  const isAuthorized = request.cookies.get(ACCESS_COOKIE)?.value === ACCESS_GRANTED

  if (!isAuthorized) {
    const loginUrl = new URL('/acceso', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/sistema/:path*'],
}
