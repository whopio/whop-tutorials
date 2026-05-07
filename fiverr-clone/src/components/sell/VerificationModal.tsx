'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { getFriendlyKycStatus } from '@/lib/kyc-status';
import { WhopVerificationEmbed } from './WhopVerificationEmbed';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function VerificationModal({ isOpen, onClose, onComplete }: VerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [startingVerification, setStartingVerification] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const hasAutoStartedRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sell/kyc/status');
      const data = await res.json();
      if (!res.ok) {
        setError('Could not load status. Please try again.');
        setLoading(false);
        return;
      }
      setVerified(data.verified);
      setStatus(data.status || null);
      if (data.companyId) setCompanyId(data.companyId);
    } catch {
      setError('Failed to load status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVerificationLink = useCallback(async () => {
    setStartingVerification(true);
    setError(null);
    try {
      const res = await fetch('/api/sell/onboard/link');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'whop_not_configured'
          ? 'Verification is temporarily unavailable. Please contact support.'
          : 'Could not start verification. Please try again.');
        setStartingVerification(false);
        return;
      }
      if (data.companyId) setCompanyId(data.companyId);
      if (data.url) setKycUrl(data.url);
    } catch {
      setError('Failed to start verification. Please try again.');
    } finally {
      setStartingVerification(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setVerified(null);
      setStatus(null);
      setError(null);
      setCompanyId(null);
      setKycUrl(null);
      hasAutoStartedRef.current = false;
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  // When not verified, go straight to verification (fetch link/company then show embed or iframe)
  useEffect(() => {
    if (!isOpen || loading || error || verified !== false || companyId || kycUrl || startingVerification) return;
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    fetchVerificationLink();
  }, [isOpen, loading, error, verified, companyId, kycUrl, startingVerification, fetchVerificationLink]);

  useEffect(() => {
    if (!kycUrl) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'whop-verification-complete') {
        setKycUrl(null);
        fetch('/api/sell/kyc/sync', { method: 'POST' }).catch(() => {});
        onClose();
        onComplete?.();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [kycUrl, onClose, onComplete]);

  const handleEmbedComplete = useCallback(() => {
    setCompanyId(null);
    onClose();
    onComplete?.();
  }, [onClose, onComplete]);

  const handleStartVerification = useCallback(async () => {
    setError(null);
    const statusRes = await fetch('/api/sell/kyc/status');
    const statusData = await statusRes.json();
    if (statusRes.ok && statusData.verified) {
      setVerified(true);
      setStatus(statusData.status || 'verified');
      return;
    }
    hasAutoStartedRef.current = false;
    fetchVerificationLink();
  }, [fetchVerificationLink]);

  const handleVerifiedClose = useCallback(() => {
    onClose();
    onComplete?.();
  }, [onClose, onComplete]);

  const handleClose = useCallback(() => {
    setVerified(null);
    setStatus(null);
    setError(null);
    setCompanyId(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  if (companyId) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-white"
        role="dialog"
        aria-modal="true"
        aria-label="Complete verification"
      >
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <WhopVerificationEmbed
            companyId={companyId}
            onComplete={handleEmbedComplete}
            onClose={() => {
              setCompanyId(null);
              handleClose();
            }}
          />
        </div>
      </div>
    );
  }

  if (kycUrl) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-white"
        role="dialog"
        aria-modal="true"
        aria-label="Complete verification"
      >
        <div
          className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 shadow-sm"
          style={{ borderBottom: '1px solid var(--gray-200)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--black)' }}>
            Identity verification
          </h2>
          <div className="flex items-center gap-2">
            <a
              href={kycUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--gray-600)' }}
            >
              Open in new tab if needed
            </a>
            <button
              type="button"
              onClick={() => setKycUrl(null)}
              className="rounded-full p-2 transition-colors hover:bg-[var(--gray-100)]"
              aria-label="Close"
            >
              <X size={20} style={{ color: 'var(--gray-600)' }} />
            </button>
          </div>
        </div>
        <iframe
          src={kycUrl}
          title="Identity verification"
          className="flex-1 w-full min-h-0 border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--white)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--gray-200)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--black)' }}>
            Identity verification
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 transition-colors hover:bg-[var(--gray-100)]"
            aria-label="Close"
          >
            <X size={20} style={{ color: 'var(--gray-600)' }} />
          </button>
        </div>
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 p-8">
          {loading && (
            <>
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--gray-200)]"
                style={{ borderTopColor: 'var(--primary)' }}
              />
              <p style={{ color: 'var(--gray-600)' }}>Checking status...</p>
            </>
          )}
          {error && !loading && (
            <>
              <p className="text-center text-sm" style={{ color: '#DC2626' }}>
                {error}
              </p>
              <button
                type="button"
                onClick={fetchStatus}
                className="rounded-full px-6 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                Try again
              </button>
            </>
          )}
          {!loading && !error && verified !== null && (
            <>
              {verified ? (
                <>
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: '#D1FAE5' }}
                  >
                    <span className="text-3xl">✓</span>
                  </div>
                  <div className="text-center">
                    <p className="font-medium" style={{ color: 'var(--black)' }}>
                      Verified
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--gray-600)' }}>
                      Your identity has been verified. You can publish gigs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifiedClose}
                    className="rounded-full px-6 py-2 text-sm font-medium"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    Done
                  </button>
                </>
              ) : startingVerification ? (
                <>
                  <div
                    className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--gray-200)]"
                    style={{ borderTopColor: 'var(--primary)' }}
                  />
                  <p style={{ color: 'var(--gray-600)' }}>Opening verification…</p>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <p className="font-medium" style={{ color: 'var(--black)' }}>
                      Status: {getFriendlyKycStatus(status)}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--gray-600)' }}>
                      Complete identity verification to publish gigs and receive payouts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartVerification}
                    className="rounded-full px-6 py-2 text-sm font-medium"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    Complete verification
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
