import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<SessionData>(
    request.cookies as any,
    sessionOptions
  )

  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/creator') ||
    request.nextUrl.pathname.startsWith('/subscriptions')

  if (isProtected && !session.isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/creator/:path*', '/subscriptions/:path*'],
}
