'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import { Elements, PayoutsSession, VerifyElement } from '@whop/embedded-components-react-js';

const REDIRECT_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}/sell/kyc/return`
    : '';

interface WhopVerificationEmbedProps {
  companyId: string;
  onComplete?: () => void;
  /** Called when the user closes the verification form inside the iframe (e.g. clicks X) */
  onClose?: () => void;
  onError?: (error: unknown) => void;
  /** Optional: redirect URL after verification (defaults to /sell/kyc/return) */
  redirectUrl?: string;
}

export function WhopVerificationEmbed({
  companyId,
  onComplete,
  onClose,
  onError,
  redirectUrl = REDIRECT_URL,
}: WhopVerificationEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const elementsPromise = useMemo(() => loadWhopElements(), []);

  const getToken = useCallback(async () => {
    const res = await fetch('/api/sell/payouts-token');
    const data = await res.json();
    return data?.token ?? null;
  }, []);

  useEffect(() => {
    if (!containerRef.current || !redirectUrl) return;
    const container = containerRef.current;
    const interval = setInterval(() => {
      const iframe = container.querySelector<HTMLIFrameElement>('iframe[src*="whop.com"], iframe[src*="elements.whop.com"]');
      if (iframe) {
        iframe.style.position = 'absolute';
        iframe.style.inset = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.minHeight = '100%';
        iframe.style.display = 'block';
      }
    }, 500);
    return () => clearInterval(interval);
  }, [redirectUrl]);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'whop-verification-embed-styles';
    style.textContent = `
      [data-whop-element*="modal"],
      [data-whop-element*="dialog"],
      [data-whop-element*="verify"],
      iframe[src*="whop.com"],
      iframe[src*="elements.whop.com"] {
        z-index: 9999 !important;
      }
      .whop-verification-embed {
        position: relative !important;
        display: flex !important;
        flex: 1 !important;
        min-height: 0 !important;
        width: 100% !important;
      }
      .whop-verification-embed iframe[src*="whop.com"],
      .whop-verification-embed iframe[src*="elements.whop.com"] {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;
        display: block !important;
      }
    `;
    if (!document.getElementById(style.id)) {
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(style.id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  if (!redirectUrl) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]">
        <p className="text-sm text-[var(--gray-600)]">Loading…</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="whop-verification-embed flex min-h-0 flex-1 w-full flex-col">
      <Elements elements={elementsPromise}>
        <PayoutsSession
          token={getToken}
          companyId={companyId}
          redirectUrl={redirectUrl}
        >
          <VerifyElement
            options={{
              includeControls: true,
              onVerificationSubmitted: () => {
                fetch('/api/sell/kyc/sync', { method: 'POST' }).catch(() => {});
                onComplete?.();
              },
              onClose: () => {
                onClose?.();
              },
            }}
            fallback={
              <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--gray-200)]"
                  style={{ borderTopColor: 'var(--primary)' }}
                />
                <span className="ml-3 text-sm text-[var(--gray-600)]">Loading verification…</span>
              </div>
            }
          />
        </PayoutsSession>
      </Elements>
    </div>
  );
}
