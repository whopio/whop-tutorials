'use client';

import { NavAccount } from '@/components/layout/NavAccount';
import { VerificationButton } from '@/components/sell/VerificationButton';
import { C } from '@/lib/design-tokens';

interface NoSellerAccountProps {
  /** Optional context for the message, e.g. "To manage gigs" or "To view your dashboard" */
  context?: string;
  /** Error from URL params */
  error?: string;
}

export function NoSellerAccount({ context, error }: NoSellerAccountProps) {
  const contextLine = context
    ? `${context} you need a seller account.`
    : 'Start selling your services. Set up your seller account to continue.';

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{ backgroundColor: C.white, borderColor: C.border, border: `1px solid ${C.border}` }}
        >
          <h1 className="mb-2 text-2xl font-bold" style={{ color: C.ink }}>
            Become a Seller
          </h1>
          <p className="mb-8" style={{ color: C.muted }}>
            {contextLine} Complete the steps below to convert your account.
          </p>

          {error === 'whop_not_configured' && (
            <div
              className="mb-6 rounded-xl p-4 text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: C.error }}
            >
              Verification is temporarily unavailable. Please contact support.
            </div>
          )}
          {error === 'onboard_failed' && (
            <div
              className="mb-6 rounded-xl p-4 text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: C.error }}
            >
              Something went wrong during setup. Please try again or contact support.
            </div>
          )}

          <ol className="mb-8 space-y-6">
            <li className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold"
                style={{ backgroundColor: C.brand, color: C.white }}
              >
                1
              </span>
              <div>
                <h3 className="font-semibold" style={{ color: C.ink }}>
                  Create your seller account
                </h3>
                <p className="text-sm mt-0.5" style={{ color: C.muted }}>
                  We&apos;ll set up your account for secure payments and payouts.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold"
                style={{ backgroundColor: C.border, color: C.muted }}
              >
                2
              </span>
              <div>
                <h3 className="font-semibold" style={{ color: C.ink }}>
                  Complete identity verification
                </h3>
                <p className="text-sm mt-0.5" style={{ color: C.muted }}>
                  Verify your identity to receive payouts. Required before publishing gigs.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold"
                style={{ backgroundColor: C.border, color: C.muted }}
              >
                3
              </span>
              <div>
                <h3 className="font-semibold" style={{ color: C.ink }}>
                  Create your first gig
                </h3>
                <p className="text-sm mt-0.5" style={{ color: C.muted }}>
                  Add packages, pricing, and start accepting orders.
                </p>
              </div>
            </li>
          </ol>

          <VerificationButton
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: C.brand }}
          >
            Continue to verification
          </VerificationButton>

          <p className="mt-6 text-center text-sm" style={{ color: C.muted }}>
            Verification is completed in this window. You will not leave gigflow.
          </p>
        </div>
      </div>
    </div>
  );
}
