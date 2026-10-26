'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * When user lands with session_id but no order_id (e.g. from external payment redirect),
 * call confirm API to create the order, then redirect with order_id.
 */
export function CheckoutCompleteHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  const status = searchParams.get('status');

  useEffect(() => {
    if (status !== 'success' || orderId || !sessionId) return;

    let mounted = true;
    const receipt = searchParams.get('receipt') ?? undefined;
    (async () => {
      try {
        // 402 means Whop hasn't marked the payment paid yet, so try again shortly.
        for (let attempt = 0; attempt < 5 && mounted; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
          const res = await fetch('/api/checkout/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, receipt_id: receipt }),
          });
          if (res.status === 402) continue;
          const data = await res.json();
          if (mounted && res.ok && data.orderId) {
            const next = new URLSearchParams(searchParams);
            next.set('order_id', data.orderId);
            next.delete('session_id');
            router.replace(`/checkout/complete?${next.toString()}`);
          }
          return;
        }
      } catch {
        // Leave as-is, will show thank you without requirements
      }
    })();
    return () => { mounted = false; };
  }, [status, orderId, sessionId, searchParams, router]);

  return null;
}
