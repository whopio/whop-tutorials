'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Minus, Plus, Check, ArrowLeft } from 'lucide-react';
import { WhopCheckoutEmbed } from '@whop/checkout/react';
import { C, GFButton } from '@/components/gigflow/design-system';

interface Extra {
  id: string;
  title: string;
  price_cents: number;
  active?: boolean;
}

interface Package {
  id: string;
  tier: string;
  title: string;
  description: string;
  price_cents: number;
  delivery_days: number;
  revisions_included: number;
}

interface OrderOptionsSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  gigId: string;
  gigTitle: string;
  pkg: Package;
  extras: Extra[];
}

type Step = 'options' | 'checkout';

export function OrderOptionsSlideOut({
  isOpen,
  onClose,
  gigId,
  gigTitle,
  pkg,
  extras,
}: OrderOptionsSlideOutProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('options');
  const [quantity, setQuantity] = useState(1);
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeExtras = extras.filter((e) => e.active !== false);
  const selectedExtras = activeExtras.filter((e) => selectedExtraIds.has(e.id));
  const baseTotal = pkg.price_cents * quantity;
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price_cents * quantity, 0);
  const totalCents = baseTotal + extrasTotal;

  const toggleExtra = (id: string) => {
    setSelectedExtraIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (isOpen) {
      setStep('options');
      setQuantity(1);
      setSelectedExtraIds(new Set());
      setSessionId(null);
      setError(null);
    }
  }, [isOpen, pkg.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 'checkout') setStep('options');
        else onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, step]);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gigId,
          gigTitle,
          packageId: pkg.id,
          packageTitle: pkg.title,
          quantity,
          extras: selectedExtras.map((e) => ({ id: e.id, title: e.title, price_cents: e.price_cents })),
          totalCents,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start checkout');
      }
      const { sessionId: id } = await res.json();
      setSessionId(id);
      setStep('checkout');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutComplete = useCallback(
    async (_planOrSessionId: string, receiptOrSetupId?: string) => {
      onClose();
      const receipt = receiptOrSetupId ?? _planOrSessionId;
      const params = new URLSearchParams({ status: 'success', receipt });
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, receipt_id: receipt }),
        });
        const data = await res.json();
        if (res.ok && data.orderId) {
          params.set('order_id', data.orderId);
        } else if (sessionId) {
          params.set('session_id', sessionId);
        }
      } catch {
        if (sessionId) params.set('session_id', sessionId);
      }
      router.push(`/checkout/complete?${params.toString()}`);
    },
    [onClose, router, sessionId]
  );

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || '';
  const returnUrl = sessionId
    ? `${baseUrl}/checkout/complete?status=success&session_id=${sessionId}`
    : `${baseUrl}/checkout/complete`;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={() => (step === 'checkout' ? setStep('options') : onClose())}
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col shadow-2xl"
        style={{ backgroundColor: C.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-2">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('options')}
                className="rounded-lg p-2 transition-colors"
                style={{ color: C.muted }}
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-lg font-semibold" style={{ color: C.ink }}>
              {step === 'options' ? 'Order options' : 'Complete payment'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors"
            style={{ color: C.muted }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'options' ? (
            <>
              <p className="mb-4 line-clamp-2 text-sm" style={{ color: C.muted }}>
                {gigTitle}
              </p>

              <div className="mb-6 rounded-xl border p-4" style={{ borderColor: C.border, backgroundColor: C.surface }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: C.ink }}>
                    {pkg.title}
                  </span>
                  <span className="font-semibold" style={{ color: C.ink }}>
                    ${(pkg.price_cents / 100).toFixed(0)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>
                    Gig quantity
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border transition-colors"
                      style={{ borderColor: C.border, color: C.ink }}
                      aria-label="Decrease"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[24px] text-center font-medium" style={{ color: C.ink }}>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border transition-colors"
                      style={{ borderColor: C.border, color: C.ink }}
                      aria-label="Increase"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {activeExtras.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-medium" style={{ color: C.ink }}>
                    Upgrade your order with extras
                  </h3>
                  <div className="space-y-2">
                    {activeExtras.map((ex) => {
                      const sel = selectedExtraIds.has(ex.id);
                      return (
                        <label
                          key={ex.id}
                          className="flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition-all"
                          style={{
                            borderColor: sel ? C.brand : C.border,
                            backgroundColor: sel ? C.brandMuted : C.white,
                          }}
                        >
                          <span className="text-sm font-medium" style={{ color: C.ink }}>
                            {ex.title}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold" style={{ color: C.ink }}>
                              +${(ex.price_cents / 100).toFixed(0)}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={sel}
                              onChange={() => toggleExtra(ex.id)}
                            />
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center border-2"
                              style={{ borderColor: sel ? C.brand : C.border, backgroundColor: sel ? C.brand : 'transparent' }}
                            >
                              {sel && <Check size={12} color="white" strokeWidth={3} />}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-xl border p-4" style={{ borderColor: C.border, backgroundColor: C.surface }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                  <Check size={14} style={{ color: C.success }} />
                  {pkg.title} package
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                  <Check size={14} style={{ color: C.success }} />
                  {pkg.delivery_days}-day delivery
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
                  <Check size={14} style={{ color: C.success }} />
                  {pkg.revisions_included === 0 ? 'No' : pkg.revisions_included} revisions
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-xl border p-4" style={{ borderColor: C.border, backgroundColor: C.surface }}>
                <div className="mb-2 text-sm font-medium" style={{ color: C.ink }}>
                  {gigTitle} – {pkg.title}
                </div>
                <div className="flex justify-between text-sm" style={{ color: C.muted }}>
                  <span>{pkg.title} × {quantity}</span>
                  <span style={{ color: C.ink }}>${((pkg.price_cents * quantity) / 100).toFixed(2)}</span>
                </div>
                {selectedExtras.map((ex) => (
                  <div key={ex.id} className="flex justify-between text-sm" style={{ color: C.muted }}>
                    <span>{ex.title} × {quantity}</span>
                    <span style={{ color: C.ink }}>${((ex.price_cents * quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t pt-2 font-semibold" style={{ borderColor: C.border, color: C.ink }}>
                  <span>Total</span>
                  <span>${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
              {sessionId && (
                <div className="min-h-[420px]">
                  <WhopCheckoutEmbed
                    sessionId={sessionId}
                    returnUrl={returnUrl}
                    onComplete={handleCheckoutComplete}
                    theme="light"
                    fallback={
                      <div className="flex min-h-[320px] items-center justify-center rounded-xl border" style={{ borderColor: C.border }}>
                        <p style={{ color: C.muted }}>Loading checkout...</p>
                      </div>
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>

        {step === 'options' && (
          <div className="border-t px-6 py-4" style={{ borderColor: C.border }}>
            {error && (
              <p className="mb-2 text-sm" style={{ color: C.error }}>{error}</p>
            )}
            <p className="mb-2 text-xs" style={{ color: C.muted }}>
              You won&apos;t be charged yet
            </p>
            <GFButton
              variant="brand"
              className="w-full"
              size="lg"
              onClick={handleContinue}
              disabled={loading}
            >
              {loading ? 'Loading...' : `Continue ($${(totalCents / 100).toFixed(0)})`}
            </GFButton>
          </div>
        )}
      </div>
    </>
  );
}
