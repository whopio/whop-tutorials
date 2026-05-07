import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/app-url';

const CHAT_SCOPES = [
  'chat:read',
  'chat:message:create',
  'dms:read',
  'dms:message:manage',
  'dms:channel:manage',
  'support_chat:read',
  'support_chat:message:create',
] as const;

/**
 * Token endpoint for Whop embedded chat. Returns { token } with required scopes.
 * The embed calls GET /api/token (alias in app/api/token/route.ts) per Whop quickstart;
 * this file is the implementation. See: https://docs.whop.com/developer/guides/chat/authentication#token-endpoint
 *
 * Order: (1) Create Access Token with user_id, (2) OAuth refresh (user token for DMs), (3) company_id for sellers.
 * CHAT_SCOPES match Whop Chat Authentication (Create Access Token API; openid/profile/email are OAuth consent only).
 */
export async function GET() {
  try {
    console.log('[Whop] API token: step 1 — auth');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Whop] API token: step 1 — unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('whop_refresh_token, whop_user_id')
      .eq('user_id', user.id)
      .single();

    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      console.log('[Whop] API token: step 1 — no API key');
      return NextResponse.json(
        { error: 'Whop is not configured for chat' },
        { status: 503 }
      );
    }

    const whop = new Whop({ apiKey });

    // 1) Create Access Token with user_id — best for DMs. Whop currently returns 400 "User access tokens are not yet supported with API key authentication", so we fall through to OAuth.
    if (profile?.whop_user_id?.trim()) {
      try {
        console.log('[Whop] API token: step 2 — Create Access Token (user_id)');
        const { token } = await whop.accessTokens.create({
          user_id: profile.whop_user_id.trim(),
          scoped_actions: [...CHAT_SCOPES],
        });
        console.log('[Whop] API token: step 3 — success (user_id token)');
        return NextResponse.json({ token });
      } catch (e: unknown) {
        const msg = e && typeof (e as { message?: string }).message === 'string' ? (e as { message: string }).message : '';
        const isNotSupported = /not yet supported|user access tokens/i.test(msg);
        if (isNotSupported) {
          console.log('[Whop] API token: step 2 — Create Access Token (user_id) not supported by API key, trying OAuth refresh');
        } else {
          console.log('[Whop] API token: step 2 — Create Access Token (user_id) failed, fallback', msg || e);
        }
        // fall through
      }
    }

    // 2) OAuth refresh — user token; required for sending messages in DM/feed (company token often can't)
    const clientId = process.env.WHOP_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.WHOP_OAUTH_CLIENT_SECRET?.trim();
    if (profile?.whop_refresh_token && clientId && clientSecret) {
      console.log('[Whop] API token: step 2 — OAuth refresh');
      const redirectUri =
        process.env.NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI?.trim() ||
        `${getAppBaseUrl()}/api/auth/callback/whop`;
      // Whop token endpoint expects application/x-www-form-urlencoded for refresh
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.whop_refresh_token,
        client_id: clientId,
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      });
      const tokenRes = await fetch('https://api.whop.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: body.toString(),
      });
      if (tokenRes.ok) {
        const tokens = await tokenRes.json();
        console.log('[Whop] API token: step 3 — success (OAuth refresh, user token)');
        return NextResponse.json({ token: tokens.access_token });
      }
      const errBody = (await tokenRes.json().catch(() => ({}))) as { error?: string; error_description?: string };
      console.log('[Whop] API token: step 2 — OAuth refresh not ok', tokenRes.status, errBody);
      // Stale or revoked refresh token — clear it so we stop retrying and user can re-link in Account Settings
      if (tokenRes.status === 400 && errBody?.error === 'invalid_grant') {
        await supabase
          .from('profiles')
          .update({ whop_refresh_token: null, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        console.log('[Whop] API token: cleared invalid refresh token; user should re-link Whop in Account Settings for chat send');
      }
    }

    // 3) Create Access Token with company_id for sellers without linked Whop (support-style channels only; DMs need user token above)
    const { data: seller } = await supabase
      .from('seller_accounts')
      .select('whop_company_id')
      .eq('user_id', user.id)
      .single();

    if (seller?.whop_company_id) {
      try {
        console.log('[Whop] API token: step 2 — Create Access Token (company_id)');
        const { token } = await whop.accessTokens.create({
          company_id: seller.whop_company_id,
          scoped_actions: [...CHAT_SCOPES],
        });
        console.log('[Whop] API token: step 3 — success (company_id token); send in chat may require user token — fix OAuth refresh if input is disabled');
        return NextResponse.json({ token });
      } catch {
        console.log('[Whop] API token: step 2 — Create Access Token (company_id) failed');
        // fall through to 403
      }
    }

    console.log('[Whop] API token: step 3 — 403 (no token path succeeded)');
    return NextResponse.json(
      { error: 'Link your Whop account in Account Settings to use live chat' },
      { status: 403 }
    );
  } catch (err) {
    console.error('[chat token]', err);
    return NextResponse.json({ error: 'Failed to create chat token' }, { status: 500 });
  }
}
