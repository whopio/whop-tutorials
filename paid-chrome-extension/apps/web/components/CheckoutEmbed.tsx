"use client";

import {
  WhopCheckoutEmbed,
  useCheckoutEmbedControls
} from "@whop/checkout/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckoutEmbed({ planId }: { planId: string }) {
  const router = useRouter();
  const checkoutControlsRef = useCheckoutEmbedControls();
  const [checkoutReady, setCheckoutReady] = useState(false);

  function handleComplete(_planId: string, receiptId?: string) {
    const params = new URLSearchParams({ source: "checkout" });
    if (receiptId) params.set("receipt", receiptId);
    router.push("/checkout/complete?" + params.toString());
  }

  return (
    <div className="checkout-embed">
      <WhopCheckoutEmbed
        ref={checkoutControlsRef}
        planId={planId}
        skipRedirect
        onStateChange={(state) => setCheckoutReady(state === "ready")}
        onComplete={handleComplete}
        theme="light"
        fallback={<div className="embed-loading">Loading secure checkout...</div>}
      />
      {!checkoutReady && (
        <p className="checkout-status">Preparing secure Whop checkout...</p>
      )}
    </div>
  );
}
