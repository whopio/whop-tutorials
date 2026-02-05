
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { exchangeCodeForTokens, fetchUserInfo } from '@/lib/oauth'
import { sessionOptions, SessionData } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle errors from Whop
  if (error) {
    return NextResponse.redirect(
      new URL(`/signin?error=${error}`, process.env.AUTH_URL)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/signin?error=missing_params', process.env.AUTH_URL)
    )
  }

  // Verify state and get code verifier
  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state')?.value
  const codeVerifier = cookieStore.get('oauth_code_verifier')?.value

  if (!storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL('/signin?error=invalid_state', process.env.AUTH_URL)
    )
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL('/signin?error=missing_verifier', process.env.AUTH_URL)
    )
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier,
      clientId: process.env.WHOP_APP_ID!,
      redirectUri: `${process.env.AUTH_URL}/api/auth/callback`,
    })

    // Fetch user info from Whop
    const userInfo = await fetchUserInfo(tokens.access_token)

    // Create or update user in database
    const user = await prisma.user.upsert({
      where: { whopUserId: userInfo.sub },
      update: {
        email: userInfo.email || '',
        name: userInfo.name,
        whopUsername: userInfo.preferred_username || '',
        avatarUrl: userInfo.picture,
      },
      create: {
        whopUserId: userInfo.sub,
        whopUsername: userInfo.preferred_username || '',
        email: userInfo.email || '',
        name: userInfo.name,
        avatarUrl: userInfo.picture,
      },
    })

    // Create session
    const response = NextResponse.redirect(
      new URL('/dashboard', process.env.AUTH_URL)
    )
    
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    session.userId = user.id
    session.whopUserId = user.whopUserId
    session.isLoggedIn = true
    await session.save()

    // Clear OAuth cookies
    cookieStore.delete('oauth_code_verifier')
    cookieStore.delete('oauth_state')

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/signin?error=auth_failed', process.env.AUTH_URL)
    )
  }
}