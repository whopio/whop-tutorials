import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getWhopOwnerUserId } from '@/lib/whop-owner';

interface BalanceItem {
  balance: number;
  currency: string;
  pending_balance: number;
  reserve_balance: number;
}

export async function GET() {
  try {
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Whop not configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: seller } = await supabase
      .from('seller_accounts')
      .select('whop_company_id')
      .eq('user_id', user.id)
      .single();

    if (!seller?.whop_company_id) {
      return NextResponse.json({
        balances: [],
        message: 'Verify your identity to see your balance',
      });
    }

    const whop = new Whop({ apiKey });
    const ledger = await whop.ledgerAccounts.retrieve(seller.whop_company_id);

    // Backfill seller's whop_user_id from ledger/company owner if missing (for DMs/chat)
    const { data: profile } = await supabase
      .from('profiles')
      .select('whop_user_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.whop_user_id) {
      const ownerId = await getWhopOwnerUserId(seller.whop_company_id, apiKey);
      if (ownerId) {
        const admin = createAdminClient();
        await admin
          .from('profiles')
          .update({ whop_user_id: ownerId, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    }

    const balances = (ledger.balances || []).map((b) => ({
      balance: b.balance ?? 0,
      currency: b.currency ?? 'usd',
      pending_balance: b.pending_balance ?? 0,
      reserve_balance: b.reserve_balance ?? 0,
    })) as BalanceItem[];

    return NextResponse.json({
      id: ledger.id,
      balances,
      ledger_type: ledger.ledger_type,
      payments_approval_status: ledger.payments_approval_status,
    });
  } catch (err) {
    console.error('[sell balance]', err);
    return NextResponse.json(
      { error: 'Failed to fetch balance', balances: [] },
      { status: 500 }
    );
  }
}
