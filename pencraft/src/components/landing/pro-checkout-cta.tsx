"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckoutPopup } from "@/components/checkout-popup";

export function ProCheckoutCta({
  isAuthenticated,
  planId,
  environment,
}: {
  isAuthenticated: boolean;
  planId: string | null;
  environment: "sandbox" | "production";
}) {
  const [showCheckout, setShowCheckout] = useState(false);

  if (!isAuthenticated) {
    return (
      <Link
        href={`/api/auth/login?redirect=${encodeURIComponent("/studio?upgrade=true")}`}
        className="mt-auto inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Get started
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => planId && setShowCheckout(true)}
        disabled={!planId}
        className="mt-auto inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Get started
      </button>
      {showCheckout && planId && (
        <CheckoutPopup
          planId={planId}
          environment={environment}
          onClose={() => setShowCheckout(false)}
          onComplete={() => {
            setShowCheckout(false);
            setTimeout(() => {
              window.location.href = "/studio?welcome=true";
            }, 3000);
          }}
        />
      )}
    </>
  );
}
