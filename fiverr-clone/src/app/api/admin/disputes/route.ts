import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      disputes: [],
      whopConfigured: false,
    });
  }

  const { data: sellers } = await supabase
    .from('seller_accounts')
    .select('user_id, whop_company_id')
    .not('whop_company_id', 'is', null);

  const sellerCompanies = (sellers ?? []).filter((s) => s.whop_company_id);
  const userIds = sellerCompanies.map((s) => s.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('user_id, display_name, email').in('user_id', userIds)
    : { data: [] };
  const profilesMap = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      { display_name: p.display_name ?? '—', email: p.email ?? '—' },
    ])
  );

  const whop = new Whop({ apiKey });
  const allDisputes: Array<{
    dispute: { id: string; amount: number; currency: string; status: string; reason: string | null; created_at: string };
    sellerName: string;
    sellerEmail: string;
    companyId: string;
  }> = [];

  for (const seller of sellerCompanies) {
    const companyId = seller.whop_company_id!;
    try {
      const list = whop.disputes.list({ company_id: companyId, first: 50 });
      const disputes: unknown[] = [];
      for await (const item of list) {
        disputes.push(item);
      }
      const p = profilesMap.get(seller.user_id);
      for (const d of disputes) {
        const dispute = d as { id: string; amount: number; currency: string; status: string; reason?: string | null; created_at?: string };
        allDisputes.push({
          dispute: {
            id: dispute.id,
            amount: dispute.amount ?? 0,
            currency: dispute.currency ?? 'usd',
            status: dispute.status ?? 'unknown',
            reason: dispute.reason ?? null,
            created_at: dispute.created_at ?? new Date().toISOString(),
          },
          sellerName: p?.display_name ?? '—',
          sellerEmail: p?.email ?? '—',
          companyId,
        });
      }
    } catch (err) {
      console.error('[admin disputes] Whop list error for company', companyId, err);
    }
  }

  allDisputes.sort(
    (a, b) =>
      new Date(b.dispute.created_at).getTime() - new Date(a.dispute.created_at).getTime()
  );

  return NextResponse.json({
    disputes: allDisputes,
    whopConfigured: true,
  });
}
