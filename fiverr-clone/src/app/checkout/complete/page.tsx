import Link from 'next/link';
import { Suspense } from 'react';
import { Check } from 'lucide-react';
import { NavAccount } from '@/components/layout/NavAccount';
import { OrderRequirementsForm } from '@/components/checkout/OrderRequirementsForm';
import { CheckoutCompleteHandler } from '@/components/checkout/CheckoutCompleteHandler';
import { C, GFButton } from '@/components/gigflow/design-system';
import { createClient } from '@/lib/supabase/server';

interface Requirement {
  id: string;
  type: 'text' | 'textarea';
  question: string;
  required: boolean;
}

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; receipt?: string; order_id?: string; session_id?: string }>;
}) {
  const { status, order_id, session_id } = await searchParams;
  const success = status === 'success';

  let order: { id: string; status: string; requirements_schema: Requirement[] } | null = null;
  let gigTitle = '';

  if (success && order_id) {
    const supabase = await createClient();
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, status, requirements_schema, gig_id')
      .eq('id', order_id)
      .single();

    if (orderData) {
      order = {
        id: orderData.id,
        status: orderData.status,
        requirements_schema: (orderData.requirements_schema || []) as Requirement[],
      };
      const { data: gig } = await supabase
        .from('gigs')
        .select('title')
        .eq('id', orderData.gig_id)
        .single();
      gigTitle = gig?.title || 'Order';
    }
  }

  const requirements = order?.requirements_schema?.filter((r) => r.question?.trim()) ?? [];
  const showRequirementsForm = success && order && order.status === 'awaiting_requirements' && requirements.length > 0;
  const awaitingConfirm = success && session_id && !order_id;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <Suspense fallback={null}>
        <CheckoutCompleteHandler />
      </Suspense>
      <NavAccount />
      <div className="mx-auto max-w-xl px-6 py-16">
        {awaitingConfirm ? (
          <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: C.white, borderColor: C.border }}>
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 mx-auto" style={{ borderColor: C.border, borderTopColor: C.brand }} />
            <p className="text-sm" style={{ color: C.muted }}>Confirming your order...</p>
          </div>
        ) : success ? (
          showRequirementsForm ? (
            <div className="rounded-2xl border p-8" style={{ backgroundColor: C.white, borderColor: C.border }}>
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: `linear-gradient(135deg, ${C.success}, #34D399)` }}
              >
                <Check size={28} color="white" strokeWidth={3} />
              </div>
              <h1 className="mb-2 text-center text-2xl font-bold" style={{ color: C.ink }}>Order placed!</h1>
              <p className="mb-8 text-center text-sm" style={{ color: C.muted }}>
                Submit the details below so the seller can start your order.
              </p>
              <OrderRequirementsForm
                orderId={order!.id}
                requirements={requirements}
                gigTitle={gigTitle}
              />
            </div>
          ) : (
            <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: C.white, borderColor: C.border }}>
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: `linear-gradient(135deg, ${C.success}, #34D399)` }}
              >
                <Check size={28} color="white" strokeWidth={3} />
              </div>
              <h1 className="text-xl font-bold mb-2" style={{ color: C.ink }}>Order placed!</h1>
              <p className="text-sm mb-2" style={{ color: C.muted }}>
                Your order <span className="font-mono font-semibold" style={{ color: C.ink }}>ORD-{order_id?.slice(0, 8) ?? '—'}</span> has been confirmed.
              </p>
              <p className="text-sm mb-8" style={{ color: C.muted }}>
                The seller has been notified and will start working shortly. You&apos;ll receive updates via notifications and email.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {order_id && (
                  <Link href={`/orders/${order_id}`}>
                    <GFButton variant="brand">Track Order</GFButton>
                  </Link>
                )}
                <Link href="/messages">
                  <GFButton variant="outline">Message Seller</GFButton>
                </Link>
                <Link href="/account">
                  <GFButton variant="ghost">View my orders</GFButton>
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: C.white, borderColor: C.border }}>
            <h1 className="mb-2 text-2xl font-bold" style={{ color: C.ink }}>Checkout incomplete</h1>
            <p className="mb-8 text-sm" style={{ color: C.muted }}>
              {status === 'error' ? 'Something went wrong or the payment was cancelled.' : 'Your order could not be completed.'}
            </p>
            <Link href="/search">
              <GFButton variant="brand">Browse gigs</GFButton>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
