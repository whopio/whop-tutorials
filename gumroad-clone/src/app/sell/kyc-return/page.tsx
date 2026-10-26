// src/app/sell/kyc-return/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function KycReturnPage() {
  const router = useRouter();

  useEffect(() => {
    async function completeKyc() {
      const res = await fetch("/api/sell/complete-kyc", { method: "POST" });
      // 409 means Whop hasn't approved the identity check yet
      router.push(res.ok ? "/sell/dashboard" : "/sell?kyc=incomplete");
    }
    completeKyc();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-accent" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-text-primary">
        Checking Verification
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Confirming your identity check with Whop...
      </p>
    </div>
  );
}
