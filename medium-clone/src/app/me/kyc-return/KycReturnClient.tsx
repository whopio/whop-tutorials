"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KycReturnClient() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/writers/kyc-return", { method: "POST" })
      .then(() => router.replace("/me/dashboard?kyc=complete"))
      .catch(() => router.replace("/me/settings?kyc=refresh"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
