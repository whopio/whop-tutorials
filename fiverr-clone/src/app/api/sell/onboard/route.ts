import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/app-url';

export async function GET() {
  const baseUrl = getAppBaseUrl();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL('/login', baseUrl));
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

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

  // Whop requires return_url and refresh_url to use https://
  const whopBaseUrl = baseUrl.replace(/^http:\/\//, 'https://');

  if (existingSeller?.whop_company_id) {
    if (!process.env.WHOP_API_KEY) {
      return NextResponse.redirect(new URL('/sell/kyc?error=whop_not_configured', baseUrl));
    }
    try {
      const Whop = (await import('@whop/sdk')).default;
      const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });
      const accountLink = await whop.accountLinks.create({
        company_id: existingSeller.whop_company_id,
        use_case: 'account_onboarding',
        return_url: `${whopBaseUrl}/sell/kyc/return`,
        refresh_url: `${whopBaseUrl}/sell/kyc/return`,
      });
      if (accountLink.url) {
        return NextResponse.redirect(accountLink.url);
      }
      return NextResponse.redirect(new URL('/sell/kyc?error=link_failed', baseUrl));
    } catch (err) {
      console.error('Whop account link error:', err);
      return NextResponse.redirect(new URL('/sell/kyc?error=link_failed', baseUrl));
    }
  }

  if (!process.env.WHOP_API_KEY || !process.env.WHOP_PLATFORM_COMPANY_ID) {
    return NextResponse.redirect(new URL('/sell/onboarding?error=whop_not_configured', baseUrl));
  }

  try {
    const Whop = (await import('@whop/sdk')).default;
    const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });

    const company = await whop.companies.create({
      email: user.email,
      title: profile?.display_name || user.email?.split('@')[0] || 'Seller',
      parent_company_id: process.env.WHOP_PLATFORM_COMPANY_ID,
      metadata: { internal_user_id: user.id },
    });

    await supabaseAdmin.from('seller_accounts').insert({
      user_id: user.id,
      whop_company_id: company.id,
      kyc_status: 'unstarted',
    });

    if (company.owner_user?.id) {
      await supabaseAdmin
        .from('profiles')
        .update({ whop_user_id: company.owner_user.id, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    const accountLink = await whop.accountLinks.create({
      company_id: company.id,
      use_case: 'account_onboarding',
      return_url: `${whopBaseUrl}/sell/kyc/return`,
      refresh_url: `${whopBaseUrl}/sell/kyc/return`,
    });

    if (accountLink.url) {
      return NextResponse.redirect(accountLink.url);
    }
  } catch (err) {
    console.error('Whop onboarding error:', err);
  }

  return NextResponse.redirect(
    new URL('/sell/onboarding?error=onboard_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  );
}
