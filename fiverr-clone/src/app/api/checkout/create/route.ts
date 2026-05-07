import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.WHOP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Whop is not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      gigId,
      gigTitle,
      packageId,
      packageTitle,
      quantity,
      extras = [],
      totalCents,
    } = body as {
      gigId: string;
      gigTitle: string;
      packageId: string;
      packageTitle: string;
      quantity: number;
      extras: Array<{ id: string; title: string; price_cents: number }>;
      totalCents: number;
    };

    if (!gigId || !packageId || totalCents == null) {
      return NextResponse.json(
        { error: 'Missing required fields: gigId, packageId, totalCents' },
        { status: 400 }
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gigId);
    let gig = isUuid
      ? (await supabase.from('gigs').select('id, seller_user_id, requirements_schema').eq('id', gigId).single()).data
      : (await supabase.from('gigs').select('id, seller_user_id, requirements_schema').eq('slug', gigId).single()).data;

    if (!gig) {
      return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: seller } = await supabaseAdmin
      .from('seller_accounts')
      .select('whop_company_id')
      .eq('user_id', gig.seller_user_id)
      .single();

    if (!seller || !seller.whop_company_id) {
      return NextResponse.json(
        { error: 'Seller has not connected a Whop account' },
        { status: 400 }
      );
    }

    const totalDollars = totalCents / 100;
    const rawTitle = quantity > 1
      ? `${gigTitle} – ${packageTitle} × ${quantity}`
      : `${gigTitle} – ${packageTitle}`;
    const productTitle = rawTitle.length > 30 ? rawTitle.slice(0, 27) + '...' : rawTitle;

    const client = new Whop({ apiKey });

    const checkoutConfig = await client.checkoutConfigurations.create({
      mode: 'payment',
      plan: {
        company_id: seller.whop_company_id,
        currency: 'usd',
        initial_price: totalDollars,
        plan_type: 'one_time',
        title: productTitle,
        product: {
          external_identifier: `gig_${gig.id}_pkg_${packageId}`,
          title: productTitle,
        },
      },
      metadata: {
        gig_id: gig.id,
        package_id: packageId,
        quantity: String(quantity ?? 1),
        extras_ids: extras.map((e: { id: string }) => e.id).join(','),
        buyer_user_id: user?.id ?? '',
      },
    });

    return NextResponse.json({
      sessionId: checkoutConfig.id,
      purchaseUrl: checkoutConfig.purchase_url,
    });
  } catch (err) {
    console.error('[checkout create]', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
