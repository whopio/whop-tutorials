import { notFound } from 'next/navigation';
import { OrderTrackClient } from '@/components/orders/OrderTrackClient';
import { OrderTrackSellerClient } from '@/components/orders/OrderTrackSellerClient';
import { createClient } from '@/lib/supabase/server';

interface Requirement {
  id: string;
  type: 'text' | 'textarea';
  question: string;
  required: boolean;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, gig_id, package_id, created_at, due_at, requirements_schema, buyer_user_id, seller_user_id, buyer_email')
    .eq('id', id)
    .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
    .single();

  if (!order) notFound();

  const isBuyer = order.buyer_user_id === user.id;

  let orderReqs: { answers: Record<string, string>; attachments: unknown[]; submitted_at: string | null } | null = null;
  if (!isBuyer) {
    const { data: reqs } = await supabase
      .from('order_requirements')
      .select('answers, attachments, submitted_at')
      .eq('order_id', id)
      .single();
    orderReqs = reqs;
  }

  let buyerProfile: { display_name: string | null; username: string | null; avatar_url: string | null; email?: string } | null = null;
  if (order.buyer_user_id) {
    const { data: p } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url')
      .eq('user_id', order.buyer_user_id)
      .single();
    buyerProfile = p;
  }

  const { data: gig } = await supabase
    .from('gigs')
    .select('title, slug, gallery')
    .eq('id', order.gig_id)
    .single();

  const { data: pkg } = await supabase
    .from('gig_packages')
    .select('title, price_cents, revisions_included')
    .eq('id', order.package_id)
    .single();

  let sellerProfile: { display_name: string | null; username: string | null; avatar_url: string | null } | null = null;
  if (order.seller_user_id) {
    const { data: sp } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url')
      .eq('user_id', order.seller_user_id)
      .single();
    sellerProfile = sp;
  }

  const { data: deliveries } = await supabase
    .from('order_deliveries')
    .select('id, delivered_at, message, items')
    .eq('order_id', id)
    .order('delivered_at', { ascending: false });

  const gallery = (gig?.gallery || []) as Array<{ url: string; type?: string }>;
  const coverUrl = gallery[0]?.url;

  const rawSchema = order.requirements_schema;
  const requirements = Array.isArray(rawSchema) ? rawSchema : (rawSchema && typeof rawSchema === 'object' && !Array.isArray(rawSchema) ? [] : []);
  const validReqs = (requirements as Requirement[]).filter((r) => r?.question?.trim());
  const showRequirementsForm = isBuyer && order.status === 'awaiting_requirements' && validReqs.length > 0;

  const statusPillKey = (['awaiting_requirements', 'in_progress', 'delivered', 'revision_requested', 'completed'].includes(order.status) ? order.status : 'in_progress') as 'in_progress' | 'delivered' | 'revision_requested' | 'completed' | 'awaiting_requirements';

  if (isBuyer) {
    return (
      <OrderTrackClient
        orderId={order.id}
        gigId={order.gig_id}
        orderStatus={order.status}
        createdAt={order.created_at}
        dueAt={(order as { due_at?: string }).due_at ?? null}
        gigTitle={gig?.title || 'Order'}
        gigSlug={gig?.slug || ''}
        coverUrl={coverUrl || null}
        packageTitle={pkg?.title || 'Package'}
        packagePriceCents={pkg?.price_cents || 0}
        revisionsIncluded={pkg?.revisions_included ?? 0}
        deliveries={(deliveries || []) as Array<{ id: string; delivered_at: string; message: string | null; items: Array<{ url?: string; name?: string }> }>}
        sellerUserId={order.seller_user_id}
        sellerDisplayName={sellerProfile?.display_name || sellerProfile?.username || 'Seller'}
        sellerUsername={sellerProfile?.username ?? null}
        sellerAvatarUrl={sellerProfile?.avatar_url ?? null}
        showRequirementsForm={showRequirementsForm}
        requirements={validReqs}
        statusPillKey={statusPillKey}
      />
    );
  }

  return (
    <OrderTrackSellerClient
      orderId={order.id}
      gigTitle={gig?.title || 'Order'}
      coverUrl={coverUrl || null}
      packageTitle={pkg?.title || 'Package'}
      packagePriceCents={pkg?.price_cents || 0}
      revisionsIncluded={pkg?.revisions_included ?? 0}
      createdAt={order.created_at}
      dueAt={(order as { due_at?: string }).due_at ?? null}
      orderStatus={order.status}
      orderReqs={orderReqs}
      validReqs={validReqs}
      buyerUserId={order.buyer_user_id}
      buyerDisplayName={buyerProfile?.display_name || buyerProfile?.username || 'Buyer'}
      buyerUsername={buyerProfile?.username ?? null}
      buyerAvatarUrl={buyerProfile?.avatar_url ?? null}
      buyerEmail={(order as { buyer_email?: string }).buyer_email ?? null}
      gigId={order.gig_id}
      deliveries={(deliveries || []) as Array<{ id: string; delivered_at: string; message: string | null; items: Array<{ url?: string; name?: string }> }>}
    />
  );
}
