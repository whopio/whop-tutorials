'use client';

import { CreditCard } from 'lucide-react';
import { usePayoutsSession } from '@whop/embedded-components-react-js';
import { C } from '@/lib/design-tokens';

export function AddPayoutMethodButton({
  disabled,
  onSuccess,
  fallbackButton,
}: {
  disabled?: boolean;
  onSuccess?: () => void;
  /** Rendered when PayoutsSession is not ready yet; receives loading state */
  fallbackButton?: (loading: boolean) => React.ReactNode;
}) {
  const payoutsSession = usePayoutsSession();
  const sessionReady = payoutsSession != null;

  const handleClick = () => {
    if (!payoutsSession) return;
    payoutsSession.showAddPayoutMethodModal(
      (m) => ({
        onComplete: () => {
          m.close();
          onSuccess?.();
        },
        onClose: () => {
          m.close();
        },
      }),
      true
    );
  };

  if (!sessionReady && fallbackButton) {
    return <>{fallbackButton(true)}</>;
  }

  if (!sessionReady) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border opacity-60 cursor-not-allowed"
        style={{ borderColor: C.border, color: C.muted }}
      >
        <CreditCard size={14} />
        Loading...
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors hover:bg-black/5"
      style={{ borderColor: C.border, color: C.ink }}
    >
      <CreditCard size={14} />
      Add payout method
    </button>
  );
}
