'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function KycReturnPage() {
  useEffect(() => {
    // When loaded in iframe (from modal), tell parent to close and refresh
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'whop-verification-complete' }, '*');
    } else if (window.opener) {
      // Loaded in popup - close popup
      window.opener.postMessage?.({ type: 'whop-verification-complete' }, '*');
      window.close();
    } else {
      // Loaded directly (e.g. full redirect) - stay on site, go to KYC status
      window.location.href = '/sell/kyc';
    }
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-8"
      style={{ backgroundColor: 'var(--gray-100)' }}
    >
      <div
        className="rounded-2xl p-8 text-center"
        style={{ backgroundColor: 'var(--white)', maxWidth: '24rem' }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: '#D1FAE5' }}
        >
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="mb-2 text-xl font-bold" style={{ color: 'var(--black)' }}>
          Verification complete
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--gray-600)' }}>
          You’re all set. Return to your dashboard to continue.
        </p>
        <Link
          href="/sell/dashboard"
          className="inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
