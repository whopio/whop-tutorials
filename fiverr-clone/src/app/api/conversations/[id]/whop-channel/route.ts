import { NextRequest, NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Ensure a Whop DM channel exists for this conversation (seller + buyer).
 * Returns { channelId, name } for use with Whop ChatElement. Creates the channel if missing.
 *
 * Create DM channel API: with_user_ids can be user IDs (user_xxxxx), email, or username per
 * https://docs.whop.com/api-reference/dm-channels/create-dm-channel. We pass Whop user IDs
 * from profiles and, when only one user has linked Whop, buyer email so the channel can be created.
 * company_id is set when seller has whop_company_id and both sides have Whop IDs (scopes channel to company).
 *
 * API key: WHOP_APP_API_KEY when set (App key has dms:channel:manage), else WHOP_API_KEY.
 * Company key must have dms:channel:manage in Dashboard → Developer → API Keys → Permissions, or use an App key.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    console.log('[Whop] API whop-channel: step 1 — request', { conversationId });
    // Use App API key for DM create if set (has dms:channel:manage); else Company API key
    const apiKey = process.env.WHOP_APP_API_KEY?.trim() || process.env.WHOP_API_KEY?.trim();
    if (!apiKey) {
      console.log('[Whop] API whop-channel: step 1 — no API key');
      return NextResponse.json({ error: 'Whop not configured (set WHOP_API_KEY or WHOP_APP_API_KEY)' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Whop] API whop-channel: step 1 — unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, buyer_user_id, seller_user_id, whop_channel_id')
      .eq('id', conversationId)
      .single();

    if (!conv || (conv.buyer_user_id !== user.id && conv.seller_user_id !== user.id)) {
      console.log('[Whop] API whop-channel: step 2 — conversation not found');
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conv.whop_channel_id) {
      console.log('[Whop] API whop-channel: step 3 — existing channel', { channelId: conv.whop_channel_id });
      return NextResponse.json({ channelId: conv.whop_channel_id, name: 'Gig conversation' });
    }

    if (!conv.buyer_user_id) {
      return NextResponse.json(
        { error: 'This conversation has no buyer. Whop chat is for buyer–seller conversations.', code: 'NO_BUYER' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const [
      { data: sellerAccount },
      { data: buyerProfile },
      { data: sellerProfile },
    ] = await Promise.all([
      admin.from('seller_accounts').select('whop_company_id').eq('user_id', conv.seller_user_id).single(),
      admin.from('profiles').select('email, whop_user_id').eq('user_id', conv.buyer_user_id).single(),
      admin.from('profiles').select('whop_user_id').eq('user_id', conv.seller_user_id).single(),
    ]);

    const whopUserIds: string[] = [];
    if (sellerProfile?.whop_user_id) whopUserIds.push(sellerProfile.whop_user_id);
    if (buyerProfile?.whop_user_id) whopUserIds.push(buyerProfile.whop_user_id);
    const buyerEmail = buyerProfile?.email?.trim();
    const withUserIds: string[] = [...whopUserIds];
    if (withUserIds.length < 2 && buyerEmail) withUserIds.push(buyerEmail);

    if (withUserIds.length < 2) {
      const message =
        whopUserIds.length === 0
          ? 'Both buyer and seller must link their Whop account in Account Settings to use live chat.'
          : 'Both users must link their Whop account in Account Settings to use live chat (one is still missing).';
      console.log('[Whop] API whop-channel: step 3 — NEED_TWO_PARTICIPANTS', { whopUserIdsLength: whopUserIds.length, withUserIdsLength: withUserIds.length });
      return NextResponse.json(
        { error: message, code: 'NEED_TWO_PARTICIPANTS' },
        { status: 400 }
      );
    }

    const companyId =
      sellerAccount?.whop_company_id && whopUserIds.length >= 2
        ? sellerAccount.whop_company_id
        : undefined;

    console.log('[Whop] API whop-channel: step 4 — creating DM channel', { withUserIds: withUserIds.length, companyId: companyId ?? null });
    const whop = new Whop({ apiKey });
    try {
      const dmChannel = await whop.dmChannels.create({
        ...(companyId && { company_id: companyId }),
        with_user_ids: withUserIds,
        custom_name: 'Gig conversation',
      });

      console.log('[Whop] API whop-channel: step 5 — DM channel created', { channelId: dmChannel.id });
      await admin
        .from('conversations')
        .update({ whop_channel_id: dmChannel.id })
        .eq('id', conversationId);

      return NextResponse.json({
        channelId: dmChannel.id,
        name: dmChannel.name ?? 'Gig conversation',
      });
    } catch (err: unknown) {
      console.error('[whop-channel] create DM failed', err);
      const errStr = typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
      const isPermissionError = errStr.includes('dms:channel:manage');
      if (isPermissionError) {
        return NextResponse.json(
          {
            error: 'Whop API key is missing dms:channel:manage. Add it in Whop Dashboard → Developer → API Keys → your key → Permissions.',
            code: 'WHOP_KEY_PERMISSION',
          },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { error: 'Could not create Whop chat channel. The buyer may need a Whop account, or your API key may need dms:channel:manage.' },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error('[whop-channel]', err);
    return NextResponse.json({ error: 'Failed to get Whop channel' }, { status: 500 });
  }
}
