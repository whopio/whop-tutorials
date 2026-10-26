import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { WhopClient, WhopEnvironment } from '@whop/sdk';
import { getAppBaseUrl } from '@/lib/app-url';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'whop_not_configured' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name')
      .eq('user_id', user.id)
      .single();

    const { data: existingSeller } = await supabaseAdmin
      .from('seller_accounts')
      .select('id, whop_company_id')
      .eq('user_id', user.id)
      .single();

    const baseUrl = getAppBaseUrl();
    const whopBaseUrl = baseUrl.replace(/^http:\/\//, 'https://');
    const returnUrl = `${whopBaseUrl}/sell/kyc/return`;

    if (existingSeller?.whop_company_id) {
      if (!process.env.WHOP_API_KEY) {
        return NextResponse.json({ error: 'whop_not_configured' }, { status: 400 });
      }
      try {
        const whop = new WhopClient({
          token: process.env.WHOP_API_KEY,
          environment:
            process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === 'production'
              ? WhopEnvironment.Production
              : WhopEnvironment.Sandbox,
        });
        const accountLink = await whop.accountLinks.create({
          account_id: existingSeller.whop_company_id,
          use_case: 'account_onboarding',
          return_url: returnUrl,
          refresh_url: returnUrl,
        });
        if (accountLink.url) {
          return NextResponse.json({ url: accountLink.url, companyId: existingSeller.whop_company_id });
        }
      } catch (err) {
        console.error('Whop account link error:', err);
        return NextResponse.json({ error: 'link_failed' }, { status: 500 });
      }
      return NextResponse.json({ error: 'link_failed' }, { status: 500 });
    }

    if (!process.env.WHOP_API_KEY?.trim() || !process.env.WHOP_PLATFORM_COMPANY_ID?.trim()) {
      return NextResponse.json({ error: 'whop_not_configured' }, { status: 400 });
    }

    const whop = new WhopClient({
      token: process.env.WHOP_API_KEY,
      environment:
        process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === 'production'
          ? WhopEnvironment.Production
          : WhopEnvironment.Sandbox,
    });

    // The API key's own account becomes the parent of the new connected account
    const company = await whop.accounts.create({
      email: user.email,
      title: profile?.display_name || user.email?.split('@')[0] || 'Seller',
      metadata: { internal_user_id: user.id },
    });

    const { error: insertError } = await supabaseAdmin.from('seller_accounts').insert({
      user_id: user.id,
      whop_company_id: company.id,
      kyc_status: 'unstarted',
    });
    if (insertError) {
      console.error('seller_accounts insert error:', insertError);
      return NextResponse.json({ error: 'onboard_failed' }, { status: 500 });
    }

    if (company.owner?.id) {
      await supabaseAdmin
        .from('profiles')
        .update({ whop_user_id: company.owner.id, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    const accountLink = await whop.accountLinks.create({
      account_id: company.id,
      use_case: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: returnUrl,
    });

    if (accountLink?.url) {
      return NextResponse.json({ url: accountLink.url, companyId: company.id });
    }
  } catch (err) {
    console.error('Whop onboard/link error:', err);
    return NextResponse.json(
      { error: 'link_failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: 'onboard_failed' }, { status: 500 });
}
