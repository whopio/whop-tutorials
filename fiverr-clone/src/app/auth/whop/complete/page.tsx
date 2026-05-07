'use client';

import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/gigflow/design-system';
import { C } from '@/components/gigflow/design-system';
import { Check } from 'lucide-react';

function WhopCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      router.replace('/login?error=invalid_callback');
      return;
    }

    const supabase = createClient();
    supabase.auth
      .verifyOtp({ email, token, type: 'magiclink' })
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          setTimeout(() => router.replace('/login?error=link'), 2500);
          return;
        }
        setStatus('ok');
        setTimeout(() => router.replace('/'), 800);
      })
      .catch(() => {
        setStatus('error');
        setTimeout(() => router.replace('/login?error=link'), 2500);
      });
  }, [searchParams, router]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: C.white }}>
        <div className="w-full max-w-[400px] text-center">
          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <span className="text-2xl" aria-hidden>×</span>
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: C.ink }}>
            Link expired or invalid
          </h1>
          <p className="text-sm mb-6" style={{ color: C.muted }}>
            This sign-in link is no longer valid. We&apos;re taking you back to login.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: C.brand, color: C.white }}
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: C.white }}>
      <div className="w-full max-w-[400px] text-center">
        <Link href="/" className="inline-block mb-10">
          <Logo />
        </Link>

        {status === 'loading' && (
          <div className="transition-opacity duration-300 opacity-100">
            <div
              className="mx-auto mb-6 h-16 w-16 rounded-2xl border-2 border-t-transparent animate-spin"
              style={{ borderColor: C.brand, borderTopColor: 'transparent' }}
            />
            <h1 className="text-xl font-semibold mb-2" style={{ color: C.ink }}>
              Signing you in
            </h1>
            <p className="text-sm" style={{ color: C.muted }}>
              One moment…
            </p>
          </div>
        )}

        {status === 'ok' && (
          <div className="transition-all duration-300 opacity-100">
            <div
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: C.brandMuted }}
            >
              <Check size={32} style={{ color: C.brand }} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: C.ink }}>
              You&apos;re in
            </h1>
            <p className="text-sm" style={{ color: C.muted }}>
              Taking you to the app…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WhopCompleteFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: C.white }}>
      <div className="w-full max-w-[400px] text-center">
        <Link href="/" className="inline-block mb-10">
          <Logo />
        </Link>
        <div
          className="mx-auto mb-6 h-16 w-16 rounded-2xl border-2 border-t-transparent animate-spin"
          style={{ borderColor: C.brand, borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: C.muted }}>
          Loading…
        </p>
      </div>
    </div>
  );
}

export default function WhopCompletePage() {
  return (
    <Suspense fallback={<WhopCompleteFallback />}>
      <WhopCompleteContent />
    </Suspense>
  );
}
