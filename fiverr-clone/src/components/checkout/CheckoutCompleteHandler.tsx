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
    (async () => {
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        if (mounted && res.ok && data.orderId) {
          const next = new URLSearchParams(searchParams);
          next.set('order_id', data.orderId);
          next.delete('session_id');
          router.replace(`/checkout/complete?${next.toString()}`);
        }
      } catch {
        // Leave as-is, will show thank you without requirements
      }
    })();
    return () => { mounted = false; };
  }, [status, orderId, sessionId, searchParams, router]);

  return null;
}
