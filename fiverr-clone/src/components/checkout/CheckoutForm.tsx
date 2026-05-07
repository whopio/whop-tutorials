'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { WhopCheckoutEmbed } from '@whop/checkout/react';
import { Button } from '@/components/ui';

interface CheckoutFormProps {
  gigId: string;
  gigTitle: string;
  gigSlug: string;
  packageId: string;
  packageTitle: string;
  packagePriceCents: number;
  deliveryDays: number;
  quantity: number;
  extras: Array<{ id: string; title: string; price_cents: number }>;
  totalCents: number;
}

export function CheckoutForm({
  gigId,
  gigTitle,
  gigSlug,
  packageTitle,
  packagePriceCents,
  deliveryDays,
  quantity,
  extras,
  totalCents,
}: CheckoutFormProps) {
  const planId = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PLAN_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const returnUrl = appUrl ? `${appUrl}/checkout/complete` : '/checkout/complete';

  const onComplete = useCallback((pId: string, receiptId?: string) => {
    window.location.href = receiptId ? `/checkout/complete?receipt=${receiptId}` : '/checkout/complete';
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6" style={{ borderColor: 'var(--gray-200)' }}>
        <h1 className="mb-2 text-xl font-bold" style={{ color: 'var(--black)' }}>
          Complete your order
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--gray-600)' }}>
          {gigTitle}
        </p>

        <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: 'var(--gray-200)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--gray-600)' }}>{packageTitle} × {quantity}</span>
            <span style={{ color: 'var(--black)' }}>${((packagePriceCents * quantity) / 100).toFixed(2)}</span>
          </div>
          {extras.map((ex) => (
            <div key={ex.id} className="flex justify-between text-sm">
              <span style={{ color: 'var(--gray-600)' }}>{ex.title} × {quantity}</span>
              <span style={{ color: 'var(--black)' }}>${((ex.price_cents * quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-3 font-semibold" style={{ borderColor: 'var(--gray-200)', color: 'var(--black)' }}>
            <span>Total</span>
            <span>${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>

        {planId ? (
          <div className="mt-6">
            <WhopCheckoutEmbed
              planId={planId}
              returnUrl={returnUrl}
              onComplete={onComplete}
              theme="light"
              fallback={
                <div className="flex min-h-[400px] items-center justify-center rounded-xl border" style={{ borderColor: 'var(--gray-200)' }}>
                  <p className="text-[var(--gray-500)]">Loading checkout...</p>
                </div>
              }
            />
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <p className="mb-2 text-sm font-medium" style={{ color: '#92400E' }}>
              Whop checkout not configured
            </p>
            <p className="mb-4 text-sm" style={{ color: '#B45309' }}>
              Add <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_WHOP_CHECKOUT_PLAN_ID</code> to your environment to enable checkout. Create a plan in your Whop dashboard and paste the plan ID here.
            </p>
            <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
              Order summary: {packageTitle} × {quantity}
              {extras.length > 0 && ` + ${extras.length} extra(s)`} = ${(totalCents / 100).toFixed(2)}
            </p>
            <Link href={`/g/${gigSlug}`} className="mt-4 inline-block">
              <Button variant="secondary">Back to gig</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
