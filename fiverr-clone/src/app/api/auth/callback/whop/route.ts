import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getAppBaseUrl } from '@/lib/app-url';

const STORAGE_KEY = 'whop_oauth_pkce';

export async function GET(request: Request) {
  const baseUrl = getAppBaseUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const cookieStore = await cookies();
  const storedRaw = cookieStore.get(STORAGE_KEY)?.value;
  cookieStore.delete(STORAGE_KEY);

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${error}`);
  }

  if (!code || !state || !storedRaw) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_callback`);
  }

  const stored = JSON.parse(storedRaw) as {
    codeVerifier: string;
    state: string;
    intent?: string;
    userId?: string;
  };
  if (state !== stored.state) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
  }
  const clientId = (process.env.WHOP_OAUTH_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.WHOP_OAUTH_CLIENT_SECRET ?? '').trim();
  const redirectUri = (
    process.env.NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI ||
    `${baseUrl}/api/auth/callback/whop`
  ).trim();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=config', baseUrl));
  }

  // Try Basic auth for client credentials (OAuth 2.0 confidential client); body has no client_secret.
  const tokenRes = await fetch('https://api.whop.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: stored.codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.json().catch(() => ({}));
    console.error('[Whop callback] token exchange failed', tokenRes.status, errBody);
    return NextResponse.redirect(new URL('/login?error=token_exchange', baseUrl));
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token;

  const userInfoRes = await fetch('https://api.whop.com/oauth/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(new URL('/login?error=userinfo', baseUrl));
  }

  const userInfo = await userInfoRes.json();
  const email = userInfo.email;
  const name = userInfo.name || userInfo.preferred_username || email?.split('@')[0];

  if (!email) {
    return NextResponse.redirect(new URL('/login?error=no_email', baseUrl));
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // "Link Whop" flow: update existing user's profile and redirect to settings
  if (stored.intent === 'link' && stored.userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .eq('user_id', stored.userId)
      .single();
    if (profile && profile.email?.toLowerCase() === email?.toLowerCase()) {
      await supabaseAdmin
        .from('profiles')
        .update({
          whop_user_id: userInfo.sub,
          whop_refresh_token: tokens.refresh_token ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', stored.userId);
      return NextResponse.redirect(new URL('/account/settings?whop_linked=1', baseUrl));
    }
    return NextResponse.redirect(new URL('/account/settings?error=whop_email_mismatch', baseUrl));
  }

  // Find existing user by email in profiles (avoids listUsers pagination limits)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .ilike('email', email)
    .maybeSingle();

  let userId: string;

  if (existingProfile?.user_id) {
    userId = existingProfile.user_id;
    await supabaseAdmin
      .from('profiles')
      .update({
        whop_user_id: userInfo.sub,
        whop_refresh_token: tokens.refresh_token ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } else {
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        whop_sub: userInfo.sub,
        avatar_url: userInfo.picture,
      },
    });
    if (createError || !newUser.user) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=create_user`
      );
    }
    userId = newUser.user.id;
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${baseUrl}/` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.redirect(new URL('/login?error=link', baseUrl));
  }

  const emailOtp = (linkData.properties as { email_otp?: string }).email_otp;
  if (emailOtp) {
    return NextResponse.redirect(
      new URL(
        `/auth/whop/complete?token=${encodeURIComponent(emailOtp)}&email=${encodeURIComponent(email)}`,
        baseUrl
      )
    );
  }

  return NextResponse.redirect(linkData.properties.action_link);
}
