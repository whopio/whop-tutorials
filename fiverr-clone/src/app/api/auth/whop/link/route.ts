import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const STORAGE_KEY = 'whop_oauth_pkce';

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) =>
    ({ '+': '-', '/': '_', '=': '' })[c] ?? ''
  );
}

function randomString(len: number) {
  return base64url(crypto.getRandomValues(new Uint8Array(len)));
}

async function sha256(str: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))));
}

/**
 * Start Whop OAuth for "Link Whop account" (store whop_user_id + refresh_token for chat).
 * User must be logged in. Callback will update profile and redirect to settings.
 */
export async function GET() {
  const clientId = process.env.WHOP_OAUTH_CLIENT_ID;
  const redirectUri =
    process.env.NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.trim() || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/api/auth/callback/whop`;

  if (!clientId) {
    return NextResponse.json({ error: 'Whop OAuth not configured' }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const linkBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    return NextResponse.redirect(new URL('/login?next=/account/settings', linkBaseUrl));
  }

  const pkce = {
    codeVerifier: randomString(32),
    state: randomString(16),
    nonce: randomString(16),
    intent: 'link' as const,
    userId: user.id,
  };

  const scopes = [
    'openid',
    'profile',
    'email',
    'chat:message:create',
    'chat:read',
    'dms:read',
    'dms:message:manage',
    'dms:channel:manage',
    'support_chat:read',
    'support_chat:message:create',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: pkce.state,
    nonce: pkce.nonce,
    code_challenge: await sha256(pkce.codeVerifier),
    code_challenge_method: 'S256',
  });

  const authUrl = `https://api.whop.com/oauth/authorize?${params}`;
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STORAGE_KEY, JSON.stringify(pkce), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });
  return response;
}
