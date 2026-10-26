import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { WhopClient, WhopEnvironment } from '@whop/sdk';
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
    // The client also sends totalCents for display. It is ignored here: the
    // price is always computed from the database below.
    const {
      gigId,
      gigTitle,
      packageId,
      packageTitle,
      quantity = 1,
      extras = [],
    } = body as {
      gigId: string;
      gigTitle: string;
      packageId: string;
      packageTitle: string;
      quantity?: number;
      extras?: Array<{ id: string; title: string; price_cents: number }>;
    };

    if (!gigId || !packageId) {
      return NextResponse.json(
        { error: 'Missing required fields: gigId, packageId' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
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

    // Price the order from the database, never from the request body, so a
    // buyer can't change what they pay. The package must belong to this gig,
    // and every extra must be one of the gig's active extras.
    const { data: pkg } = await supabaseAdmin
      .from('gig_packages')
      .select('id, price_cents')
      .eq('id', packageId)
      .eq('gig_id', gig.id)
      .single();

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const extraIds = [...new Set(extras.map((e) => e.id))];
    let extrasCents = 0;
    if (extraIds.length > 0) {
      const { data: gigExtras } = await supabaseAdmin
        .from('gig_extras')
        .select('id, price_cents')
        .eq('gig_id', gig.id)
        .eq('active', true)
        .in('id', extraIds);

      if (!gigExtras || gigExtras.length !== extraIds.length) {
        return NextResponse.json({ error: 'Invalid extras' }, { status: 400 });
      }
      extrasCents = gigExtras.reduce((sum, e) => sum + e.price_cents, 0);
    }

    const totalCents = (pkg.price_cents + extrasCents) * quantity;

    // Calculate the platform fee. PLATFORM_FEE_BPS is in basis points (1000 = 10%).
    const totalDollars = totalCents / 100;
    const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || '1000', 10);
    const applicationFee = Math.round((totalCents * platformFeeBps) / 10000) / 100;

    const rawTitle = quantity > 1
      ? `${gigTitle} – ${packageTitle} × ${quantity}`
      : `${gigTitle} – ${packageTitle}`;
    const productTitle = rawTitle.length > 30 ? rawTitle.slice(0, 27) + '...' : rawTitle;

    const client = new WhopClient({
      token: apiKey,
      environment:
        process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === 'production'
          ? WhopEnvironment.Production
          : WhopEnvironment.Sandbox,
    });

    // Create the checkout configuration on the seller's connected account.
    // The application_fee_amount is routed to your platform account, and Whop
    // requires it to be positive, so it is only sent when the rate is above 0.
    // The Whop API accepts it, but the SDK types don't list it, so we build the
    // plan as a variable first instead of writing it inline.
    const plan = {
      account_id: seller.whop_company_id,
      currency: 'usd',
      initial_price: totalDollars,
      plan_type: 'one_time' as const,
      ...(applicationFee > 0 ? { application_fee_amount: applicationFee } : {}),
      title: productTitle,
    };

    const checkoutConfig = await client.checkoutConfigurations.create({
      mode: 'payment',
      plan,
      metadata: {
        gig_id: gig.id,
        package_id: pkg.id,
        quantity: String(quantity),
        extras_ids: extraIds.join(','),
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
