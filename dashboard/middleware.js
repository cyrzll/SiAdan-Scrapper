import { NextResponse } from 'next/server'

export function middleware(request) {
  const session = request.cookies.get('admin_session')
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/'],
}
