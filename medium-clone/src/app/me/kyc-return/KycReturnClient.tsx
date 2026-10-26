"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KycReturnClient() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/writers/kyc-return", { method: "POST" })
      .then((res) => (res.ok ? res.json() : { kycComplete: false }))
      .then((data: { kycComplete?: boolean }) =>
        router.replace(data.kycComplete ? "/me/dashboard?kyc=complete" : "/me/settings?kyc=refresh"),
      )
      .catch(() => router.replace("/me/settings?kyc=refresh"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
