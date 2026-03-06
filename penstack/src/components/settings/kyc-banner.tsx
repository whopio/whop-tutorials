"use client";

import { useState } from "react";
import { CreditCard, Loader2, AlertTriangle } from "lucide-react";
import { isDemoMode } from "@/lib/demo";

interface KycBannerProps {
  writerId: string;
}

export function KycBanner({ writerId }: KycBannerProps) {
  const [loading, setLoading] = useState(false);

  async function handleKyc() {
    setLoading(true);
    try {
      if (isDemoMode()) {
        // In demo mode, bypass KYC
        const res = await fetch(`/api/writers/${writerId}/kyc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demo: true }),
        });
        if (res.ok) {
          window.location.reload();
        }
        return;
      }

      const res = await fetch(`/api/writers/${writerId}/kyc`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Failed to start KYC process. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle className="h-5 w-5 text-amber-700" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-amber-900">
          Enable Paid Subscriptions
        </h3>
        <p className="mt-0.5 text-xs text-amber-700">
          Complete identity verification to start accepting payments from
          subscribers.
          {isDemoMode() && " (Demo mode: verification will be bypassed)"}
        </p>
      </div>
      <button
        onClick={handleKyc}
        disabled={loading}
        className="btn-primary shrink-0"
      >
        {loading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-1.5 h-4 w-4" />
        )}
        {isDemoMode() ? "Enable (Demo)" : "Start Verification"}
      </button>
    </div>
  );
}
