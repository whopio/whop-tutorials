// src/app/sell/page.tsx
"use client";

import { useState, Suspense } from "react";
import { ArrowRight, DollarSign, Shield, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SellPage() {
  return (
    <Suspense>
      <SellPageContent />
    </Suspense>
  );
}

function SellPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kycIncomplete = searchParams.get("kyc") === "incomplete";
  const [loading, setLoading] = useState(false);
  const [sandboxMessage, setSandboxMessage] = useState(false);

  async function handleOnboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/sell/onboard", { method: "POST" });
      const data = await res.json();

      if (data.sandbox) {
        setSandboxMessage(true);
        setTimeout(() => router.push("/sell/dashboard"), 2000);
        return;
      }

      if (data.redirect) {
        if (data.redirect.startsWith("http")) {
          window.location.href = data.redirect;
        } else {
          router.push(data.redirect);
        }
      }
    } catch (error) {
      console.error("Onboarding failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-text-primary sm:text-5xl">
        Share your work with the world
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-lg text-text-secondary">
        Sell digital products on Shelfie. We handle payments, payouts, and
        compliance — you focus on creating.
      </p>

      {/* KYC incomplete notice */}
      {kycIncomplete && (
        <div className="mt-8 inline-flex items-center gap-2 bg-warning/10 px-6 py-3 text-sm font-medium text-warning">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          Complete identity verification to start selling. Click below to continue.
        </div>
      )}

      {/* Benefits */}
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        <div className="border border-border bg-surface p-6 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-accent" />
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            Set your own price
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Free or paid. You decide how much your work is worth.
          </p>
        </div>

        <div className="border border-border bg-surface p-6 text-center">
          <Shield className="mx-auto h-10 w-10 text-accent" />
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            We handle payments
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Whop processes payments, handles compliance, and manages disputes.
          </p>
        </div>

        <div className="border border-border bg-surface p-6 text-center">
          <Zap className="mx-auto h-10 w-10 text-accent" />
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            Keep 95% of every sale
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Just a 5% platform fee. Withdraw to your bank anytime.
          </p>
        </div>
      </div>

      {/* Sandbox success message */}
      {sandboxMessage && (
        <div className="mt-8 inline-flex items-center gap-2 bg-success/10 px-6 py-3 text-sm font-medium text-success">
          <CheckCircle className="h-5 w-5" aria-hidden="true" />
          This demo uses Whop Sandbox — KYC is not required. Redirecting to
          dashboard...
        </div>
      )}

      {!sandboxMessage && (
        <>
          <button
            onClick={handleOnboard}
            disabled={loading}
            className="mt-12 inline-flex items-center gap-2 bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Setting up..." : kycIncomplete ? "Complete Verification" : "Get Started"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-4 text-xs text-text-secondary">
            {kycIncomplete
              ? "You'll be redirected to Whop to complete identity verification."
              : "You\u2019ll need to verify your identity to receive payouts. This is handled securely by Whop."}
          </p>
        </>
      )}
    </div>
  );
}
