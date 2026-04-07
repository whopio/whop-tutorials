// src/app/sell/kyc-return/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function KycReturnPage() {
  const router = useRouter();

  useEffect(() => {
    async function completeKyc() {
      await fetch("/api/sell/complete-kyc", { method: "POST" });
      router.push("/sell/dashboard");
    }
    completeKyc();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <CheckCircle className="h-12 w-12 text-success" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-text-primary">
        Verification Complete
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Redirecting to your seller dashboard...
      </p>
    </div>
  );
}
