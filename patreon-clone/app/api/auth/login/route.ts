import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generatePKCE, generateState, buildAuthorizeUrl } from '@/lib/oauth'

export async function GET() {
  const { codeVerifier, codeChallenge } = generatePKCE()
  const state = generateState()
  
  const clientId = process.env.WHOP_APP_ID!
  const redirectUri = `${process.env.AUTH_URL}/api/auth/callback`

  // Store PKCE verifier and state in a short-lived cookie
  const cookieStore = await cookies()
  cookieStore.set('oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge,
    state,
  })

  return NextResponse.redirect(authorizeUrl)
}